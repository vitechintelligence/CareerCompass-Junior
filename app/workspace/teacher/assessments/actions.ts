"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function boundedText(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

async function requireTeacherForClass(classId: string) {
  if (!UUID_RE.test(classId)) throw new Error("Invalid class reference.");
  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) throw new Error("Teacher access required.");
  if (profile.account_type === "teacher") {
    const sql = getDb();
    const rows = await sql`select 1 from teacher_assignments where class_id=${classId} and teacher_id=${profile.id} limit 1`;
    if (!rows[0]) throw new Error("You are not assigned to this class.");
  }
  return profile;
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

  if (!["quiz", "exam", "checkpoint"].includes(assessmentType)) throw new Error("Invalid assessment type.");
  if (!titleEn || !titleVi) throw new Error("Assessment title is required in both languages.");
  if (dueAt && Number.isNaN(Date.parse(dueAt))) throw new Error("Invalid due date.");
  if (timeLimit !== null && (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 300)) throw new Error("Time limit must be between 1 and 300 minutes.");

  const questions: Array<{ questionType: string; promptEn: string; promptVi: string; options: string[]; correctAnswer: string; points: number }> = [];
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
    if (!Number.isFinite(points) || points < 0 || points > 1000) throw new Error(`Question ${index} has invalid points.`);
    questions.push({ questionType, promptEn, promptVi, options, correctAnswer, points });
  }
  if (questions.length === 0) throw new Error("Add at least one assessment question.");

  const profile = await requireTeacherForClass(classId);
  const sql = getDb();
  const rows = await sql`
    insert into assessments (
      class_id, created_by, assessment_type, title_en, title_vi,
      instructions_en, instructions_vi, status, due_at, time_limit_minutes
    )
    values (
      ${classId}, ${profile.id}, ${assessmentType}, ${titleEn}, ${titleVi},
      ${instructionsEn || null}, ${instructionsVi || null}, 'published',
      ${dueAt || null}::timestamptz, ${timeLimit}
    )
    returning id
  `;
  const assessmentId = String(rows[0]?.id || "");
  if (!assessmentId) throw new Error("Could not create assessment.");

  for (let index = 0; index < questions.length; index += 1) {
    const q = questions[index];
    await sql`
      insert into assessment_questions (
        assessment_id, sort_order, question_type, prompt_en, prompt_vi, options, correct_answer, points
      )
      values (
        ${assessmentId}, ${index + 1}, ${q.questionType}, ${q.promptEn}, ${q.promptVi},
        ${JSON.stringify(q.options)}::jsonb, ${q.correctAnswer || null}, ${q.points}
      )
    `;
  }

  revalidatePath("/workspace/teacher/assessments");
  revalidatePath("/workspace/teacher/my-classroom");
  revalidatePath("/workspace/teacher");
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
