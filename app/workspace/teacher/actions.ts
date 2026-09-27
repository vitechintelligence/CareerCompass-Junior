"use server";

import { revalidatePath } from "next/cache";
import { requireTeacherClassAccess } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { buildActivityContract } from "@/lib/learning/activity-contract";

const attendanceStates = new Set(["present", "late", "absent", "excused"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function boundedText(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

async function requireTeacherForClass(classId: string) {
  return (await requireTeacherClassAccess(classId)).profile;
}

export async function recordAttendance(formData: FormData) {
  const classId = String(formData.get("classId") || "");
  const studentId = String(formData.get("studentId") || "");
  const status = String(formData.get("status") || "");
  const sessionDate = String(formData.get("sessionDate") || "");

  if (!UUID_RE.test(classId) || !UUID_RE.test(studentId) || !DATE_RE.test(sessionDate) || !attendanceStates.has(status)) {
    throw new Error("Invalid attendance entry.");
  }

  const profile = await requireTeacherForClass(classId);
  const sql = getDb();

  const membership = await sql`
    select 1 from class_memberships
    where class_id = ${classId}
      and student_id = ${studentId}
      and status = 'active'
    limit 1
  `;
  if (!membership[0]) throw new Error("Student is not active in this class.");

  await sql`
    insert into attendance (class_id, student_id, session_date, status, recorded_by)
    values (${classId}, ${studentId}, ${sessionDate}::date, ${status}, ${profile.id})
    on conflict (class_id, student_id, session_date) do update set
      status = excluded.status,
      recorded_by = excluded.recorded_by,
      recorded_at = now()
  `;

  revalidatePath("/workspace/teacher");
}

export async function createAssignment(formData: FormData) {
  const classId = String(formData.get("classId") || "");
  const titleEn = boundedText(formData.get("titleEn"), 160);
  const titleVi = boundedText(formData.get("titleVi"), 160);
  const instructionsEn = boundedText(formData.get("instructionsEn"), 4000);
  const instructionsVi = boundedText(formData.get("instructionsVi"), 4000);
  const dueAt = boundedText(formData.get("dueAt"), 40);
  const activityId = boundedText(formData.get("activityId"), 100);

  if (!UUID_RE.test(classId) || !titleEn || !titleVi) throw new Error("Assignment title is required in both languages.");
  if (activityId && !UUID_RE.test(activityId)) throw new Error("Invalid curriculum activity.");
  if (dueAt && Number.isNaN(Date.parse(dueAt))) throw new Error("Invalid assignment due date.");

  const profile = await requireTeacherForClass(classId);
  const sql = getDb();

  let activityContentVersion: number | null = null;
  let activityContract: Record<string, unknown> | null = null;
  if (activityId) {
    const rows = await sql`
      select
        a.id, a.code, a.activity_type, a.content, a.content_version,
        a.instructions_en, a.instructions_vi,
        b.code as book_code, b.age_band, b.level_label,
        bu.code as unit_code, bu.objective_en, bu.objective_vi
      from activities a
      join book_units bu on bu.id=a.unit_id
      join books b on b.id=bu.book_id
      where a.id=${activityId}
        and a.status='published'
        and bu.status='published'
        and b.status='published'
      limit 1
    `;
    const activity = rows[0];
    if (!activity) throw new Error("Published curriculum activity not found.");
    const contract = buildActivityContract({
      activityId: String(activity.id),
      activityCode: String(activity.code),
      courseId: String(activity.book_code),
      unitId: String(activity.unit_code),
      activityType: String(activity.activity_type),
      contentVersion: Number(activity.content_version || 1),
      ageBand: activity.age_band ? String(activity.age_band) : null,
      englishLevel: activity.level_label ? String(activity.level_label) : null,
      objectiveEn: activity.objective_en ? String(activity.objective_en) : null,
      objectiveVi: activity.objective_vi ? String(activity.objective_vi) : null,
      instructionsEn: activity.instructions_en ? String(activity.instructions_en) : null,
      instructionsVi: activity.instructions_vi ? String(activity.instructions_vi) : null,
      content: activity.content,
    });
    activityContentVersion = contract.contentVersion;
    activityContract = contract;
  }

  await sql`
    insert into assignments (
      class_id, activity_id, activity_content_version, activity_contract,
      created_by, title_en, title_vi,
      instructions_en, instructions_vi, due_at, status
    )
    values (
      ${classId}, ${activityId || null}, ${activityContentVersion},
      ${activityContract ? JSON.stringify(activityContract) : null}::jsonb,
      ${profile.id}, ${titleEn}, ${titleVi},
      ${instructionsEn || null}, ${instructionsVi || null},
      ${dueAt || null}::timestamptz, 'published'
    )
  `;

  revalidatePath("/workspace/teacher");
}

export async function saveFeedback(formData: FormData) {
  const submissionId = String(formData.get("submissionId") || "");
  const feedbackText = boundedText(formData.get("feedbackText"), 4000);
  const rawScore = boundedText(formData.get("score"), 16);
  const score = rawScore ? Number(rawScore) : null;

  if (!UUID_RE.test(submissionId) || !feedbackText || (score !== null && (!Number.isFinite(score) || score < 0 || score > 100))) {
    throw new Error("Valid feedback and a score between 0 and 100 are required.");
  }

  const sql = getDb();
  const submission = await sql`
    select s.id, a.class_id
    from submissions s
    join assignments a on a.id = s.assignment_id
    where s.id = ${submissionId}
    limit 1
  `;
  const classId = String(submission[0]?.class_id || "");
  if (!classId) throw new Error("Submission not found.");
  const profile = await requireTeacherForClass(classId);

  await sql`
    insert into teacher_feedback (
      submission_id, teacher_id, feedback_text, score, visibility
    )
    values (${submissionId}, ${profile.id}, ${feedbackText}, ${score}, 'student')
  `;

  await sql`
    update submissions
    set status = 'returned', updated_at = now()
    where id = ${submissionId}
  `;

  revalidatePath("/workspace/teacher");
}
