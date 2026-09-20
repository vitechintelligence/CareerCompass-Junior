"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalized(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export async function submitAssessment(formData: FormData) {
  const assessmentId = String(formData.get("assessmentId") || "");
  if (!UUID_RE.test(assessmentId)) throw new Error("Invalid assessment.");

  const profile = await getCurrentProfile();
  if (!profile || profile.account_type !== "student") throw new Error("Student access required.");
  const sql = getDb();

  const assessments = await sql`
    select a.id, a.class_id, a.status, a.max_attempts, a.due_at
    from assessments a
    join class_memberships cm on cm.class_id=a.class_id
    where a.id=${assessmentId}
      and a.status='published'
      and cm.student_id=${profile.id}
      and cm.status='active'
    limit 1
  `;
  const assessment = assessments[0];
  if (!assessment) throw new Error("Assessment is not available to this learner.");

  const previous = await sql`select count(*)::int as count from assessment_attempts where assessment_id=${assessmentId} and student_id=${profile.id}`;
  const attemptNumber = Number(previous[0]?.count || 0) + 1;
  if (attemptNumber > Number(assessment.max_attempts || 1)) throw new Error("Maximum attempts reached.");

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

  const attemptRows = await sql`
    insert into assessment_attempts (
      assessment_id, student_id, attempt_number, status, score, max_score, submitted_at
    )
    values (
      ${assessmentId}, ${profile.id}, ${attemptNumber}, ${needsReview ? 'submitted' : 'reviewed'},
      ${score}, ${maxScore}, now()
    )
    returning id
  `;
  const attemptId = String(attemptRows[0]?.id || "");
  if (!attemptId) throw new Error("Could not save assessment attempt.");

  for (const answer of answers) {
    await sql`
      insert into assessment_answers (attempt_id, question_id, answer_text, auto_correct, awarded_points)
      values (${attemptId}, ${answer.questionId}, ${answer.answerText || null}, ${answer.autoCorrect}, ${answer.awardedPoints})
    `;
  }

  revalidatePath(`/workspace/student/assessment/${assessmentId}`);
  revalidatePath("/workspace/student");
}
