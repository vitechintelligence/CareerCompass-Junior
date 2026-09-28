"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireActiveProfile, requireStudentClassAccess } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { assessmentEvidenceLevel } from "@/lib/evidence/evidence-policy";
import { normalizeSubmissionId } from "@/lib/learning/idempotency";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalized(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export async function submitAssessment(formData: FormData) {
  const assessmentId = String(formData.get("assessmentId") || "");
  const submissionId = normalizeSubmissionId(formData.get("submissionId"));
  if (!UUID_RE.test(assessmentId) || !submissionId) throw new Error("Invalid assessment submission.");

  const profile = await requireActiveProfile(["student"]);
  const sql = getDb();

  const assessments = await sql`
    select
      a.id, a.class_id, a.status, a.max_attempts, a.due_at,
      a.content_version, a.demonstrated_threshold, a.title_en, a.title_vi,
      c.organization_id
    from assessments a
    join classes c on c.id=a.class_id and c.status='active'
    join class_memberships cm on cm.class_id=a.class_id
    where a.id=${assessmentId}
      and a.status='published'
      and cm.student_id=${profile.id}
      and cm.status='active'
    limit 1
  `;
  const assessment = assessments[0];
  if (!assessment) throw new Error("Assessment is not available to this learner.");
  await requireStudentClassAccess(String(assessment.class_id), profile);

  const questions = await sql`
    select id, question_type, correct_answer, points
    from assessment_questions
    where assessment_id=${assessmentId}
    order by sort_order, id
  `;
  if (questions.length === 0) throw new Error("Assessment has no questions.");

  let score = 0;
  let maxScore = 0;
  let needsReview = false;
  const answers: Array<{ questionId: string; answerText: string; autoCorrect: boolean | null; awardedPoints: number | null }> = [];

  for (const question of questions) {
    const questionId = String(question.id);
    const answerText = String(formData.get(`q_${questionId}`) || "").trim().slice(0, 5000);
    const points = Number(question.points || 0);
    maxScore += points;
    const correctAnswer = question.correct_answer ? String(question.correct_answer) : "";
    let autoCorrect: boolean | null = null;
    let awardedPoints: number | null = null;

    if (correctAnswer) {
      autoCorrect = normalized(answerText) === normalized(correctAnswer);
      awardedPoints = autoCorrect ? points : 0;
      score += awardedPoints;
    } else {
      needsReview = true;
    }
    answers.push({ questionId, answerText, autoCorrect, awardedPoints });
  }

  const evidenceLevel = needsReview
    ? "practiced"
    : assessmentEvidenceLevel({
        score,
        maxScore,
        demonstratedThreshold: Number(assessment.demonstrated_threshold || 70),
      });
  const submissionHash = createHash("sha256")
    .update(JSON.stringify({
      assessmentId,
      studentId: profile.id,
      contentVersion: Number(assessment.content_version || 1),
      answers,
    }))
    .digest("hex");
  const capsuleIntegrityHash = createHash("sha256")
    .update(`${assessmentId}:${profile.id}:${submissionId}:${evidenceLevel}:${score}:${maxScore}`)
    .digest("hex");
  const answerPayload = answers.map((answer) => ({
    question_id: answer.questionId,
    answer_text: answer.answerText,
    auto_correct: answer.autoCorrect,
    awarded_points: answer.awardedPoints,
  }));

  const attemptRows = await sql`
    with locked as (
      select pg_advisory_xact_lock(
        hashtextextended(${`${assessmentId}:${profile.id}`}, 0)
      )
    ),
    existing as (
      select aa.id, aa.attempt_number, aa.score, aa.max_score, aa.status
      from assessment_attempts aa
      cross join locked
      where aa.submission_id=${submissionId}::uuid
        and aa.assessment_id=${assessmentId}
        and aa.student_id=${profile.id}
        and aa.submission_hash=${submissionHash}
      limit 1
    ),
    next_attempt as (
      select coalesce(max(aa.attempt_number), 0)::int + 1 as attempt_number
      from assessment_attempts aa
      cross join locked
      where aa.assessment_id=${assessmentId}
        and aa.student_id=${profile.id}
        and not exists (select 1 from existing)
    ),
    inserted as (
      insert into assessment_attempts (
        assessment_id, student_id, attempt_number, status, score, max_score,
        submitted_at, assessment_content_version, evidence_level,
        submission_id, submission_hash
      )
      select
        ${assessmentId}, ${profile.id}, next_attempt.attempt_number,
        ${needsReview ? "submitted" : "reviewed"}, ${score}, ${maxScore}, now(),
        ${Number(assessment.content_version || 1)}, ${evidenceLevel},
        ${submissionId}::uuid, ${submissionHash}
      from next_attempt
      where next_attempt.attempt_number <= ${Number(assessment.max_attempts || 1)}
      on conflict (submission_id) where submission_id is not null do update set
        submission_id=excluded.submission_id
      where assessment_attempts.assessment_id=excluded.assessment_id
        and assessment_attempts.student_id=excluded.student_id
        and assessment_attempts.submission_hash=excluded.submission_hash
      returning id, attempt_number, score, max_score, status
    ),
    chosen as (
      select * from inserted
      union all
      select * from existing
      limit 1
    ),
    answer_input as (
      select *
      from jsonb_to_recordset(${JSON.stringify(answerPayload)}::jsonb) as x(
        question_id uuid,
        answer_text text,
        auto_correct boolean,
        awarded_points numeric
      )
    ),
    saved_answers as (
      insert into assessment_answers (
        attempt_id, question_id, answer_text, auto_correct, awarded_points
      )
      select
        chosen.id, answer_input.question_id, answer_input.answer_text,
        answer_input.auto_correct, answer_input.awarded_points
      from chosen cross join answer_input
      on conflict (attempt_id, question_id) do nothing
      returning id
    ),
    capsule as (
      insert into learning_capsules (
        semantic_id, learner_id, organization_id, class_id,
        source_type, source_id, title_en, title_vi,
        evidence_summary, skill_tags, mastery_level, integrity_hash,
        status, sharing_scope, achieved_on
      )
      select
        'assessment-' || chosen.id::text, ${profile.id},
        ${String(assessment.organization_id)}, ${String(assessment.class_id)},
        'assessment_attempt', chosen.id, ${String(assessment.title_en)}, ${String(assessment.title_vi)},
        jsonb_build_object(
          'assessmentId', ${assessmentId},
          'assessmentContentVersion', ${Number(assessment.content_version || 1)},
          'attempt', chosen.attempt_number,
          'evaluationType', 'server_auto_score',
          'result', ${evidenceLevel},
          'score', chosen.score,
          'maxScore', chosen.max_score,
          'demonstratedThreshold', ${Number(assessment.demonstrated_threshold || 70)}
        ),
        ${["assessment", "objective-evidence"]}, ${evidenceLevel},
        ${capsuleIntegrityHash}, 'draft', 'learner', current_date
      from chosen
      where ${evidenceLevel !== "practiced"}
      on conflict (semantic_id) do nothing
      returning id
    )
    select chosen.id, chosen.attempt_number, chosen.status, chosen.score, chosen.max_score
    from chosen
  `;
  const attemptId = String(attemptRows[0]?.id || "");
  if (!attemptId) throw new Error("Maximum attempts reached or this submission key conflicts with another attempt.");
  revalidatePath(`/workspace/student/assessment/${assessmentId}`);
  revalidatePath("/workspace/student");
}
