"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEMANTIC_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/;

function boundedText(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

async function requireTeacherOrganization(organizationId: string) {
  if (!UUID_RE.test(organizationId)) throw new Error("Invalid organization reference.");
  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) throw new Error("Teacher access required.");
  if (profile.account_type === "teacher") {
    const sql = getDb();
    const rows = await sql`
      select 1 from organization_memberships
      where organization_id=${organizationId}
        and profile_id=${profile.id}
        and role='teacher'
        and status='active'
      limit 1
    `;
    if (!rows[0]) throw new Error("Teacher is not active in this organization.");
  }
  return profile;
}

async function requireOwnedCustomClassroom(classId: string) {
  if (!UUID_RE.test(classId)) throw new Error("Invalid classroom reference.");
  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) throw new Error("Teacher access required.");
  const sql = getDb();
  const rows = profile.account_type === "platform_admin"
    ? await sql`select id, organization_id from classes where id=${classId} and class_scope='teacher_custom' and status='active' limit 1`
    : await sql`select id, organization_id from classes where id=${classId} and class_scope='teacher_custom' and owner_teacher_id=${profile.id} and status='active' limit 1`;
  if (!rows[0]) throw new Error("My Classroom class not found or not owned by this teacher.");
  return { profile, organizationId: String(rows[0].organization_id) };
}

export async function createTeacherClassroom(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const name = boundedText(formData.get("name"), 120);
  const subjectLabel = boundedText(formData.get("subjectLabel"), 100);
  const levelLabel = boundedText(formData.get("levelLabel"), 80);
  const academicCycle = boundedText(formData.get("academicCycle"), 40);
  if (!name) throw new Error("Classroom name is required.");

  const profile = await requireTeacherOrganization(organizationId);
  const sql = getDb();
  const semanticId = `teacher-class-${randomUUID().slice(0, 8)}`;
  const rows = await sql`
    insert into classes (
      organization_id, semantic_id, name, level_label, academic_cycle, status,
      class_scope, subject_label, owner_teacher_id
    )
    values (
      ${organizationId}, ${semanticId}, ${name}, ${levelLabel || null}, ${academicCycle || null}, 'active',
      'teacher_custom', ${subjectLabel || null}, ${profile.id}
    )
    returning id
  `;
  const classId = String(rows[0]?.id || "");
  if (!classId) throw new Error("Could not create classroom.");

  await sql`
    insert into teacher_assignments (class_id, teacher_id, assignment_role)
    values (${classId}, ${profile.id}, 'lead_teacher')
    on conflict (class_id, teacher_id) do update set assignment_role='lead_teacher'
  `;

  revalidatePath("/workspace/teacher/my-classroom");
  revalidatePath("/workspace/teacher");
}

export async function addLearnerToTeacherClassroom(formData: FormData) {
  const classId = String(formData.get("classId") || "");
  const semanticId = boundedText(formData.get("studentSemanticId"), 100);
  if (!SEMANTIC_ID_RE.test(semanticId)) throw new Error("Valid learner semantic ID required.");

  const { organizationId } = await requireOwnedCustomClassroom(classId);
  const sql = getDb();
  const rows = await sql`
    select p.id
    from profiles p
    join organization_memberships om on om.profile_id=p.id
    where p.semantic_id=${semanticId}
      and p.account_type='student'
      and p.status='active'
      and om.organization_id=${organizationId}
      and om.role='student'
      and om.status='active'
    limit 1
  `;
  const studentId = String(rows[0]?.id || "");
  if (!studentId) throw new Error("Active learner is not enrolled in this organization.");

  await sql`
    insert into class_memberships (class_id, student_id, status)
    values (${classId}, ${studentId}, 'active')
    on conflict (class_id, student_id) do update set status='active'
  `;
  revalidatePath("/workspace/teacher/my-classroom");
}
