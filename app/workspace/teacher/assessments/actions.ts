"use server";

import { revalidatePath } from "next/cache";
import { requireTeacherClassAccess } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { assessmentEvidenceLevel, evidenceStatusForLevel } from "@/lib/evidence/evidence-policy";
import { createHash } from "node:crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function boundedText(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

async function requireTeacherForClass(classId: string) {
  return (await requireTeacherClassAccess(classId)).profile;
}

export async function createAssessment(formData: FormData) {
  const classId = String(formData.get("classId") || "");
  const assessmentType = boundedText(formData.get("assessmentType"), 20);
  const titleEn = boundedText(formData.get("titleEn"), 160);
  const titleVi = boundedText(formData.get("titleVi"), 160);
  const instructionsEn = boundedText(formData.get("instructionsEn"), 3000);
  const instructionsVi = boundedText(formData.get("instructionsVi"), 3000);
  const dueAt = boundedText(formData.get("dueAt"), 40);
  const timeLimitRaw = boundedText(formData.get("timeLimitMinutes"), 8);
  const timeLimit = timeLimitRaw ? Number(timeLimitRaw) : null;
  const thresholdRaw = boundedText(formData.get("demonstratedThreshold"), 8);
  const demonstratedThreshold = thresholdRaw ? Number(thresholdRaw) : 70;

  if (!["quiz", "exam", "checkpoint"].includes(assessmentType)) throw new Error("Invalid assessment type.");
  if (!titleEn || !titleVi) throw new Error("Assessment title is required in both languages.");
  if (dueAt && Number.isNaN(Date.parse(dueAt))) throw new Error("Invalid due date.");
  if (timeLimit !== null && (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 300)) throw new Error("Time limit must be between 1 and 300 minutes.");
  if (!Number.isFinite(demonstratedThreshold) || demonstratedThreshold < 0 || demonstratedThreshold > 100) throw new Error("Demonstrated threshold must be between 0 and 100.");

  const questions: Array<{
    questionType: string;
    promptEn: string;
    promptVi: string;
    options: string[];
    correctAnswer: string;
    points: number;
    objectiveEn: string;
    objectiveVi: string;
    rubricGuidance: string;
  }> = [];
  for (let index = 1; index <= 5; index += 1) {
    const promptEn = boundedText(formData.get(`q${index}PromptEn`), 1200);
    const promptVi = boundedText(formData.get(`q${index}PromptVi`), 1200);
    if (!promptEn && !promptVi) continue;
    if (!promptEn || !promptVi) throw new Error(`Question ${index} needs both English and Vietnamese prompts.`);
    const questionType = boundedText(formData.get(`q${index}Type`), 30);
    if (!["multiple_choice", "short_text"].includes(questionType)) throw new Error(`Question ${index} has an invalid type.`);
    const options = boundedText(formData.get(`q${index}Options`), 2000).split("|").map((item) => item.trim()).filter(Boolean).slice(0, 6);
    if (questionType === "multiple_choice" && options.length < 2) throw new Error(`Question ${index} needs at least two options separated by |.`);
    const correctAnswer = boundedText(formData.get(`q${index}Correct`), 500);
    const rawPoints = boundedText(formData.get(`q${index}Points`), 12);
    const points = rawPoints ? Number(rawPoints) : 1;
    const objectiveEn = boundedText(formData.get(`q${index}ObjectiveEn`), 800);
    const objectiveVi = boundedText(formData.get(`q${index}ObjectiveVi`), 800);
    const rubricGuidance = boundedText(formData.get(`q${index}Rubric`), 1600);
    if (!Number.isFinite(points) || points < 0 || points > 1000) throw new Error(`Question ${index} has invalid points.`);
    questions.push({ questionType, promptEn, promptVi, options, correctAnswer, points, objectiveEn, objectiveVi, rubricGuidance });
  }
  if (questions.length === 0) throw new Error("Add at least one assessment question.");

  const profile = await requireTeacherForClass(classId);
  const sql = getDb();
  const rows = await sql`
    insert into assessments (
      class_id, created_by, assessment_type, title_en, title_vi,
      instructions_en, instructions_vi, status, due_at, time_limit_minutes,
      demonstrated_threshold
    )
    values (
      ${classId}, ${profile.id}, ${assessmentType}, ${titleEn}, ${titleVi},
      ${instructionsEn || null}, ${instructionsVi || null}, 'published',
      ${dueAt || null}::timestamptz, ${timeLimit}, ${demonstratedThreshold}
    )
    returning id
  `;
  const assessmentId = String(rows[0]?.id || "");
  if (!assessmentId) throw new Error("Could not create assessment.");

  for (let index = 0; index < questions.length; index += 1) {
    const q = questions[index];
    await sql`
      insert into assessment_questions (
        assessment_id, sort_order, question_type, prompt_en, prompt_vi, options, correct_answer, points,
        learning_objective_en, learning_objective_vi, rubric
      )
      values (
        ${assessmentId}, ${index + 1}, ${q.questionType}, ${q.promptEn}, ${q.promptVi},
        ${JSON.stringify(q.options)}::jsonb, ${q.correctAnswer || null}, ${q.points},
        ${q.objectiveEn || null}, ${q.objectiveVi || null},
        ${JSON.stringify(q.rubricGuidance ? { guidance: q.rubricGuidance } : {})}::jsonb
      )
    `;
  }

  revalidatePath("/workspace/teacher/assessments");
  revalidatePath("/workspace/teacher/my-classroom");
  revalidatePath("/workspace/teacher");
}

export async function reviewAssessmentAttempt(formData: FormData) {
  const attemptId = String(formData.get("attemptId") || "");
  const feedback = boundedText(formData.get("feedback"), 4000);
  const teacherVerified = String(formData.get("verifyEvidence") || "") === "yes";
  if (!UUID_RE.test(attemptId) || !feedback) throw new Error("Assessment attempt and feedback are required.");

  const sql = getDb();
  const attempts = await sql`
    select
      aa.id, aa.assessment_id, aa.student_id, aa.status,
      aa.assessment_content_version,
      a.class_id, a.title_en, a.title_vi, a.demonstrated_threshold,
      c.organization_id
    from assessment_attempts aa
    join assessments a on a.id=aa.assessment_id
    join classes c on c.id=a.class_id and c.status='active'
    where aa.id=${attemptId}
    limit 1
  `;
  const attempt = attempts[0];
  if (!attempt) throw new Error("Assessment attempt not found.");
  if (String(attempt.status) !== "submitted") throw new Error("This assessment attempt is no longer waiting for review.");
  const profile = await requireTeacherForClass(String(attempt.class_id));

  const answerRows = await sql`
    select
      ans.id, ans.auto_correct, ans.awarded_points,
      q.points, q.learning_objective_en, q.learning_objective_vi, q.rubric
    from assessment_answers ans
    join assessment_questions q on q.id=ans.question_id
    where ans.attempt_id=${attemptId}
    order by q.sort_order, q.id
  `;
  if (answerRows.length === 0) throw new Error("Assessment answers are missing.");

  let score = 0;
  let maxScore = 0;
  const manualUpdates: Array<{ id: string; points: number }> = [];
  for (const answer of answerRows) {
    const max = Number(answer.points || 0);
    maxScore += max;
    if (answer.auto_correct === null) {
      const raw = boundedText(formData.get(`points_${String(answer.id)}`), 16);
      const points = raw ? Number(raw) : 0;
      if (!Number.isFinite(points) || points < 0 || points > max) {
        throw new Error("Awarded points must be within the question maximum.");
      }
      manualUpdates.push({ id: String(answer.id), points });
      score += points;
    } else {
      score += Number(answer.awarded_points || 0);
    }
  }

  const evidenceLevel = assessmentEvidenceLevel({
    score,
    maxScore,
    demonstratedThreshold: Number(attempt.demonstrated_threshold || 70),
    teacherVerified,
  });
  const status = evidenceStatusForLevel(evidenceLevel);
  const rubricResult = {
    evaluationType: "teacher_rubric_review",
    reviewer: profile.id,
    manuallyReviewedAnswers: manualUpdates.length,
    demonstratedThreshold: Number(attempt.demonstrated_threshold || 70),
    evidenceLevel,
  };
  const evidenceSummary = {
    learnerId: String(attempt.student_id),
    assessmentId: String(attempt.assessment_id),
    assessmentContentVersion: Number(attempt.assessment_content_version || 1),
    attemptId,
    evaluationType: "teacher_rubric_review",
    evaluator: profile.id,
    result: evidenceLevel,
    score,
    maxScore,
    feedback,
    verified: teacherVerified,
  };
  const integrityHash = createHash("sha256")
    .update(JSON.stringify(evidenceSummary))
    .digest("hex");

  await sql.transaction((txn) => {
    const queries = manualUpdates.map((item) => txn`
      update assessment_answers
      set awarded_points=${item.points}, reviewed_by=${profile.id}, reviewed_at=now()
      where id=${item.id}
        and attempt_id=${attemptId}
        and auto_correct is null
    `);

    queries.push(txn`
      update assessment_attempts
      set
        status='reviewed',
        score=${score},
        max_score=${maxScore},
        reviewed_at=now(),
        reviewed_by=${profile.id},
        review_feedback=${feedback},
        rubric_result=${JSON.stringify(rubricResult)}::jsonb,
        evidence_level=${evidenceLevel}
      where id=${attemptId}
        and status='submitted'
    `);

    if (evidenceLevel !== "practiced") {
      queries.push(txn`
        insert into learning_capsules (
          semantic_id, learner_id, organization_id, class_id,
          source_type, source_id, title_en, title_vi,
          evidence_summary, skill_tags, mastery_level, integrity_hash,
          verified_by, verified_at, status, sharing_scope, achieved_on
        )
        values (
          ${`assessment-${attemptId}`}, ${String(attempt.student_id)},
          ${String(attempt.organization_id)}, ${String(attempt.class_id)},
          'assessment_attempt', ${attemptId}, ${String(attempt.title_en)}, ${String(attempt.title_vi)},
          ${JSON.stringify(evidenceSummary)}::jsonb,
          ${["assessment", "rubric-reviewed"]}, ${evidenceLevel}, ${integrityHash},
          ${teacherVerified ? profile.id : null}, ${teacherVerified ? new Date().toISOString() : null}::timestamptz,
          ${status}, 'learner', current_date
        )
        on conflict (semantic_id) do update set
          evidence_summary=excluded.evidence_summary,
          mastery_level=excluded.mastery_level,
          integrity_hash=excluded.integrity_hash,
          verified_by=excluded.verified_by,
          verified_at=excluded.verified_at,
          status=excluded.status,
          updated_at=now()
      `);
    }
    return queries;
  }, { isolationLevel: "Serializable" });

  revalidatePath("/workspace/teacher/assessments");
  revalidatePath("/workspace/teacher");
  revalidatePath("/workspace/student");
}

export async function setAssessmentStatus(formData: FormData) {
  const assessmentId = String(formData.get("assessmentId") || "");
  const status = boundedText(formData.get("status"), 20);
  if (!UUID_RE.test(assessmentId) || !["published", "closed", "archived"].includes(status)) throw new Error("Invalid assessment update.");
  const sql = getDb();
  const rows = await sql`select class_id from assessments where id=${assessmentId} limit 1`;
  const classId = String(rows[0]?.class_id || "");
  if (!classId) throw new Error("Assessment not found.");
  await requireTeacherForClass(classId);
  await sql`update assessments set status=${status}, updated_at=now() where id=${assessmentId}`;
  revalidatePath("/workspace/teacher/assessments");
}
