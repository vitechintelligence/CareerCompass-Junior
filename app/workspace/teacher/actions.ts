"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

const attendanceStates = new Set(["present", "late", "absent", "excused"]);

async function requireTeacherForClass(classId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) {
    throw new Error("Teacher access required.");
  }

  if (profile.account_type === "teacher") {
    const sql = getDb();
    const rows = await sql`
      select 1
      from teacher_assignments
      where class_id = ${classId}
        and teacher_id = ${profile.id}
      limit 1
    `;
    if (!rows[0]) throw new Error("You are not assigned to this class.");
  }

  return profile;
}

export async function recordAttendance(formData: FormData) {
  const classId = String(formData.get("classId") || "");
  const studentId = String(formData.get("studentId") || "");
  const status = String(formData.get("status") || "");
  const sessionDate = String(formData.get("sessionDate") || "");

  if (!classId || !studentId || !sessionDate || !attendanceStates.has(status)) {
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
  const titleEn = String(formData.get("titleEn") || "").trim();
  const titleVi = String(formData.get("titleVi") || "").trim();
  const instructionsEn = String(formData.get("instructionsEn") || "").trim();
  const instructionsVi = String(formData.get("instructionsVi") || "").trim();
  const dueAt = String(formData.get("dueAt") || "").trim();

  if (!classId || !titleEn || !titleVi) throw new Error("Assignment title is required in both languages.");

  const profile = await requireTeacherForClass(classId);
  const sql = getDb();

  await sql`
    insert into assignments (
      class_id, created_by, title_en, title_vi,
      instructions_en, instructions_vi, due_at, status
    )
    values (
      ${classId}, ${profile.id}, ${titleEn}, ${titleVi},
      ${instructionsEn || null}, ${instructionsVi || null},
      ${dueAt || null}::timestamptz, 'published'
    )
  `;

  revalidatePath("/workspace/teacher");
}

export async function saveFeedback(formData: FormData) {
  const submissionId = String(formData.get("submissionId") || "");
  const feedbackText = String(formData.get("feedbackText") || "").trim();
  const rawScore = String(formData.get("score") || "").trim();
  const score = rawScore ? Number(rawScore) : null;

  if (!submissionId || !feedbackText || (score !== null && !Number.isFinite(score))) {
    throw new Error("Valid feedback is required.");
  }

  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) {
    throw new Error("Teacher access required.");
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
  await requireTeacherForClass(classId);

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
