"use server";

import { revalidatePath } from "next/cache";
import { ensureStudentProfile, getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

async function requirePartnerOrganization(organizationId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !["partner_admin", "platform_admin"].includes(profile.account_type)) {
    throw new Error("Partner administrator access required.");
  }

  if (profile.account_type === "partner_admin") {
    const sql = getDb();
    const rows = await sql`
      select 1
      from organization_memberships
      where organization_id = ${organizationId}
        and profile_id = ${profile.id}
        and role = 'partner_admin'
        and status = 'active'
      limit 1
    `;
    if (!rows[0]) throw new Error("You do not manage this organization.");
  }

  return profile;
}

async function requirePartnerClass(classId: string) {
  const sql = getDb();
  const rows = await sql`select organization_id from classes where id = ${classId} limit 1`;
  const organizationId = String(rows[0]?.organization_id || "");
  if (!organizationId) throw new Error("Class not found.");
  await requirePartnerOrganization(organizationId);
  return organizationId;
}

export async function requestPartnerAccess(formData: FormData) {
  const organizationName = String(formData.get("organizationName") || "").trim();
  const organizationType = String(formData.get("organizationType") || "");
  if (!organizationName || !["school", "training_center"].includes(organizationType)) {
    throw new Error("A valid school or training center is required.");
  }

  const profile = await ensureStudentProfile("vi");
  if (!profile) throw new Error("Sign in before requesting partner access.");

  const sql = getDb();
  await sql`
    insert into partner_onboarding_requests (
      requester_profile_id, organization_name, organization_type, status
    )
    values (${profile.id}, ${organizationName}, ${organizationType}, 'pending')
    on conflict (requester_profile_id) do update set
      organization_name = excluded.organization_name,
      organization_type = excluded.organization_type,
      status = case
        when partner_onboarding_requests.status = 'approved' then 'approved'
        else 'pending'
      end,
      updated_at = now()
  `;

  revalidatePath("/workspace/partner");
}

export async function createClass(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const name = String(formData.get("name") || "").trim();
  const levelLabel = String(formData.get("levelLabel") || "").trim();
  const academicCycle = String(formData.get("academicCycle") || "").trim();
  if (!organizationId || !name) throw new Error("Organization and class name are required.");

  await requirePartnerOrganization(organizationId);
  const sql = getDb();
  const suffix = crypto.randomUUID().slice(0, 8);
  await sql`
    insert into classes (
      organization_id, semantic_id, name, level_label, academic_cycle, status
    )
    values (
      ${organizationId}, ${`vn-class-${suffix}`}, ${name},
      ${levelLabel || null}, ${academicCycle || null}, 'active'
    )
  `;

  revalidatePath("/workspace/partner");
}

export async function assignTeacher(formData: FormData) {
  const classId = String(formData.get("classId") || "");
  const semanticId = String(formData.get("teacherSemanticId") || "").trim();
  if (!classId || !semanticId) throw new Error("Class and teacher ID are required.");

  await requirePartnerClass(classId);
  const sql = getDb();
  const teacher = await sql`
    select id from profiles
    where semantic_id = ${semanticId}
      and account_type = 'teacher'
      and status = 'active'
    limit 1
  `;
  const teacherId = String(teacher[0]?.id || "");
  if (!teacherId) throw new Error("Active teacher profile not found.");

  await sql`
    insert into teacher_assignments (class_id, teacher_id, assignment_role)
    values (${classId}, ${teacherId}, 'teacher')
    on conflict (class_id, teacher_id) do update set assignment_role = 'teacher'
  `;

  revalidatePath("/workspace/partner");
}

export async function enrollStudent(formData: FormData) {
  const classId = String(formData.get("classId") || "");
  const semanticId = String(formData.get("studentSemanticId") || "").trim();
  if (!classId || !semanticId) throw new Error("Class and learner ID are required.");

  await requirePartnerClass(classId);
  const sql = getDb();
  const learner = await sql`
    select id from profiles
    where semantic_id = ${semanticId}
      and account_type = 'student'
      and status = 'active'
    limit 1
  `;
  const studentId = String(learner[0]?.id || "");
  if (!studentId) throw new Error("Active learner profile not found.");

  await sql`
    insert into class_memberships (class_id, student_id, status)
    values (${classId}, ${studentId}, 'active')
    on conflict (class_id, student_id) do update set status = 'active'
  `;

  const book = await sql`select id from books where code = 'CCJ-MASTERY-BEGINNER' and status = 'published' limit 1`;
  if (book[0]?.id) {
    await sql`
      insert into student_enrollments (student_id, book_id, class_id, status)
      values (${studentId}, ${String(book[0].id)}, ${classId}, 'active')
      on conflict (student_id, book_id, class_id) do update set status = 'active'
    `;
  }

  revalidatePath("/workspace/partner");
}
