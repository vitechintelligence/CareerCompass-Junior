"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ensureStudentProfile, getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEMANTIC_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/;

function boundedText(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

async function requirePartnerOrganization(organizationId: string) {
  if (!UUID_RE.test(organizationId)) throw new Error("Invalid organization reference.");

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
  if (!UUID_RE.test(classId)) throw new Error("Invalid class reference.");
  const sql = getDb();
  const rows = await sql`select organization_id from classes where id = ${classId} and status='active' limit 1`;
  const organizationId = String(rows[0]?.organization_id || "");
  if (!organizationId) throw new Error("Class not found.");
  await requirePartnerOrganization(organizationId);
  return organizationId;
}

export async function requestPartnerAccess(formData: FormData) {
  const organizationName = boundedText(formData.get("organizationName"), 160);
  const organizationType = String(formData.get("organizationType") || "");
  if (organizationName.length < 2 || !["school", "training_center"].includes(organizationType)) {
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
  const name = boundedText(formData.get("name"), 120);
  const levelLabel = boundedText(formData.get("levelLabel"), 80);
  const academicCycle = boundedText(formData.get("academicCycle"), 40);
  if (!UUID_RE.test(organizationId) || name.length < 2) throw new Error("Organization and class name are required.");

  await requirePartnerOrganization(organizationId);
  const sql = getDb();
  const suffix = randomUUID().slice(0, 8);
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

export async function activateTeacher(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const semanticId = boundedText(formData.get("teacherSemanticId"), 100);
  if (!UUID_RE.test(organizationId) || !SEMANTIC_ID_RE.test(semanticId)) throw new Error("Organization and valid account ID are required.");

  await requirePartnerOrganization(organizationId);
  const sql = getDb();
  const account = await sql`
    select id, account_type
    from profiles
    where semantic_id = ${semanticId}
      and status = 'active'
    limit 1
  `;
  const profileId = String(account[0]?.id || "");
  if (!profileId) throw new Error("Active account not found.");
  if (String(account[0]?.account_type) === "partner_admin" || String(account[0]?.account_type) === "platform_admin") {
    throw new Error("Administrative accounts cannot be converted to teacher access here.");
  }

  await sql`
    update profiles
    set account_type = 'teacher', updated_at = now()
    where id = ${profileId}
  `;
  await sql`
    insert into organization_memberships (organization_id, profile_id, role, status)
    values (${organizationId}, ${profileId}, 'teacher', 'active')
    on conflict (organization_id, profile_id, role) do update set status = 'active'
  `;

  revalidatePath("/workspace/partner");
}

export async function assignTeacher(formData: FormData) {
  const classId = String(formData.get("classId") || "");
  const semanticId = boundedText(formData.get("teacherSemanticId"), 100);
  if (!UUID_RE.test(classId) || !SEMANTIC_ID_RE.test(semanticId)) throw new Error("Class and valid teacher ID are required.");

  const organizationId = await requirePartnerClass(classId);
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
    insert into organization_memberships (organization_id, profile_id, role, status)
    values (${organizationId}, ${teacherId}, 'teacher', 'active')
    on conflict (organization_id, profile_id, role) do update set status = 'active'
  `;

  await sql`
    insert into teacher_assignments (class_id, teacher_id, assignment_role)
    values (${classId}, ${teacherId}, 'teacher')
    on conflict (class_id, teacher_id) do update set assignment_role = 'teacher'
  `;

  revalidatePath("/workspace/partner");
}

export async function enrollStudent(formData: FormData) {
  const classId = String(formData.get("classId") || "");
  const semanticId = boundedText(formData.get("studentSemanticId"), 100);
  if (!UUID_RE.test(classId) || !SEMANTIC_ID_RE.test(semanticId)) throw new Error("Class and valid learner ID are required.");

  const organizationId = await requirePartnerClass(classId);
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
    insert into organization_memberships (organization_id, profile_id, role, status)
    values (${organizationId}, ${studentId}, 'student', 'active')
    on conflict (organization_id, profile_id, role) do update set status = 'active'
  `;

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


export async function recordLearnerConsent(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const semanticId = boundedText(formData.get("studentSemanticId"), 100);
  const consentType = String(formData.get("consentType") || "");
  const learnerConfirmation = formData.get("learnerConfirmation") === "on";
  const guardianConfirmation = formData.get("guardianConfirmation") === "on";

  if (!UUID_RE.test(organizationId) || !SEMANTIC_ID_RE.test(semanticId)) {
    throw new Error("Organization and valid learner ID are required.");
  }

  const allowedTypes = ["digital_learning", "learning_evidence", "guardian_reporting", "ai_assistive_features"];
  if (!allowedTypes.includes(consentType)) throw new Error("Invalid consent type.");

  const actor = await requirePartnerOrganization(organizationId);
  const sql = getDb();
  const learner = await sql`
    select id
    from profiles
    where semantic_id = ${semanticId}
      and account_type = 'student'
      and status = 'active'
    limit 1
  `;
  const learnerId = String(learner[0]?.id || "");
  if (!learnerId) throw new Error("Active learner profile not found.");

  await sql`
    insert into learner_consent_records (
      learner_id, organization_id, consent_type, status,
      learner_confirmation, guardian_confirmation, policy_version, captured_by, captured_at
    )
    values (
      ${learnerId}, ${organizationId}, ${consentType}, 'active',
      ${learnerConfirmation}, ${guardianConfirmation}, '2026-01', ${actor.id}, now()
    )
    on conflict (learner_id, organization_id, consent_type, policy_version) do update set
      status = 'active',
      learner_confirmation = excluded.learner_confirmation,
      guardian_confirmation = excluded.guardian_confirmation,
      captured_by = excluded.captured_by,
      captured_at = now(),
      revoked_at = null
  `;

  revalidatePath("/workspace/partner");
}
