"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { isLearnerAgeBand } from "@/lib/learner-age-bands";
import { COMMUNITY_PRIVACY_VERSION, COMMUNITY_TERMS_VERSION } from "@/lib/community-terms";
import { requireCommunityManager, requireInstitutionAdult } from "@/lib/community-access";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEMANTIC_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/;

function value(input: FormDataEntryValue | null, max = 500) {
  return String(input || "").trim().slice(0, max);
}

function checked(input: FormDataEntryValue | null) {
  return input === "on" || input === "true" || input === "1";
}

function assertUuid(input: string, label: string) {
  if (!UUID_RE.test(input)) throw new Error(`Invalid ${label}.`);
}

export async function acceptCommunityAgreement(formData: FormData) {
  const organizationId = value(formData.get("organizationId"), 60);
  assertUuid(organizationId, "organization");
  const profile = await requireInstitutionAdult(organizationId);
  const locale = value(formData.get("locale"), 2) === "en" ? "en" : "vi";

  if (!checked(formData.get("authorized"))) {
    throw new Error("Confirm that you are authorized by the institution.");
  }
  if (!checked(formData.get("acceptTerms"))) {
    throw new Error("You must accept the Community Terms & Privacy Notice to manage the community.");
  }

  const sql = getDb();
  await sql`
    insert into community_agreement_acceptances (
      organization_id, profile_id, accepted_role, locale,
      terms_version, privacy_version, accepted, accepted_at
    )
    values (
      ${organizationId}, ${profile.id}, ${profile.account_type === "teacher" ? "teacher" : "partner_admin"},
      ${locale}, ${COMMUNITY_TERMS_VERSION}, ${COMMUNITY_PRIVACY_VERSION}, true, now()
    )
    on conflict (organization_id, profile_id, terms_version, privacy_version) do update set
      accepted=true,
      locale=excluded.locale,
      accepted_role=excluded.accepted_role,
      accepted_at=now(),
      revoked_at=null
  `;

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
}

export async function setTeacherCommunityPermissions(formData: FormData) {
  const organizationId = value(formData.get("organizationId"), 60);
  assertUuid(organizationId, "organization");
  const actor = await requireInstitutionAdult(organizationId);
  if (!["partner_admin","platform_admin"].includes(actor.account_type)) {
    throw new Error("Only the school administrator can delegate community management.");
  }

  const teacherSemanticId = value(formData.get("teacherSemanticId"), 100);
  if (!SEMANTIC_RE.test(teacherSemanticId)) throw new Error("Invalid teacher semantic ID.");

  const sql = getDb();
  const rows = await sql`
    select p.id
    from profiles p
    join organization_memberships om on om.profile_id=p.id
    where p.semantic_id=${teacherSemanticId}
      and p.account_type='teacher'
      and p.status='active'
      and om.organization_id=${organizationId}
      and om.role='teacher'
      and om.status='active'
    limit 1
  `;
  if (!rows[0]) throw new Error("Active teacher not found in this institution.");

  await sql`
    insert into community_staff_permissions (
      organization_id, teacher_id, can_initiate_seasons, can_enable_students,
      can_moderate, can_assign_advisors, granted_by
    )
    values (
      ${organizationId}, ${String(rows[0].id)},
      ${checked(formData.get("canInitiate"))},
      ${checked(formData.get("canEnableStudents"))},
      ${checked(formData.get("canModerate"))},
      ${checked(formData.get("canAssignAdvisors"))},
      ${actor.id}
    )
    on conflict (organization_id, teacher_id) do update set
      can_initiate_seasons=excluded.can_initiate_seasons,
      can_enable_students=excluded.can_enable_students,
      can_moderate=excluded.can_moderate,
      can_assign_advisors=excluded.can_assign_advisors,
      granted_by=excluded.granted_by,
      granted_at=now(),
      updated_at=now()
  `;

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
}

export async function setCommunityStudentAccess(formData: FormData) {
  const organizationId = value(formData.get("organizationId"), 60);
  assertUuid(organizationId, "organization");
  const actor = await requireCommunityManager(organizationId, "enable_students");
  const studentSemanticId = value(formData.get("studentSemanticId"), 100);
  if (!SEMANTIC_RE.test(studentSemanticId)) throw new Error("Invalid learner semantic ID.");
  const ageBand = value(formData.get("ageBand"), 10);
  if (!isLearnerAgeBand(ageBand)) throw new Error("Choose a supported age level.");

  const guardianConfirmed = checked(formData.get("guardianConsentConfirmed"));
  const learnerAcknowledged = checked(formData.get("learnerAcknowledged"));
  if (!guardianConfirmed) {
    throw new Error("Record the institution's confirmation that required parent/guardian permission has been obtained before enabling community access.");
  }
  if (!learnerAcknowledged) {
    throw new Error("Record the learner acknowledgement before enabling community participation.");
  }

  const sql = getDb();
  const learner = await sql`
    select p.id
    from profiles p
    where p.semantic_id=${studentSemanticId}
      and p.account_type='student'
      and p.status='active'
      and exists (
        select 1
        from class_memberships cm
        join classes c on c.id=cm.class_id
        where cm.student_id=p.id
          and cm.status='active'
          and c.organization_id=${organizationId}
      )
    limit 1
  `;
  if (!learner[0]) throw new Error("Active learner not found in this institution.");

  await sql`
    insert into community_student_access (
      organization_id, student_id, age_band, status,
      guardian_consent_confirmed, learner_acknowledged, consent_policy_version,
      enabled_by, enabled_at
    )
    values (
      ${organizationId}, ${String(learner[0].id)}, ${ageBand}, 'enabled',
      true, true, ${COMMUNITY_PRIVACY_VERSION}, ${actor.id}, now()
    )
    on conflict (organization_id, student_id) do update set
      age_band=excluded.age_band,
      status='enabled',
      guardian_consent_confirmed=true,
      learner_acknowledged=true,
      consent_policy_version=excluded.consent_policy_version,
      enabled_by=excluded.enabled_by,
      enabled_at=now(),
      updated_at=now()
  `;

  const deliveryProfileReady = await sql`select to_regclass('public.learner_delivery_profiles') as table_name`;
  if (deliveryProfileReady[0]?.table_name) {
    await sql`
      insert into learner_delivery_profiles (organization_id, learner_id, age_band, assigned_by, assigned_at)
      values (${organizationId}, ${String(learner[0].id)}, ${ageBand}, ${actor.id}, now())
      on conflict (organization_id, learner_id) do update set
        age_band=excluded.age_band,
        assigned_by=excluded.assigned_by,
        assigned_at=now(),
        updated_at=now()
    `;
  }

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
  revalidatePath("/workspace/student/community");
}

export async function updateOrganizationDataPolicy(formData: FormData) {
  const organizationId = value(formData.get("organizationId"), 60);
  assertUuid(organizationId, "organization");
  const profile = await requireInstitutionAdult(organizationId);
  if (!["partner_admin","platform_admin"].includes(profile.account_type)) {
    throw new Error("Only the school administrator can change institution data and AI modes.");
  }

  const storageMode = value(formData.get("storageMode"), 40);
  const aiMode = value(formData.get("aiMode"), 30);
  const observabilityMode = value(formData.get("observabilityMode"), 30);
  const aiProvider = value(formData.get("aiProvider"), 80);

  if (!["platform_metadata","school_capsule","vng_cloud","local_browser","manual"].includes(storageMode)) {
    throw new Error("Invalid evidence storage mode.");
  }
  if (!["off","byok","local_browser"].includes(aiMode)) throw new Error("Invalid AI mode.");
  if (!["metadata_only","disabled","self_hosted"].includes(observabilityMode)) {
    throw new Error("Invalid observability mode.");
  }

  const sql = getDb();
  await sql`
    insert into organization_data_policies (
      organization_id, evidence_storage_mode, ai_mode, ai_provider,
      byok_configured, vng_status, observability_mode, raw_student_content_tracing,
      partner_acknowledged_data_responsibility, configured_by, configured_at
    )
    values (
      ${organizationId}, ${storageMode}, ${aiMode}, ${aiProvider || null},
      false, ${storageMode === "vng_cloud" ? "requested" : "not_requested"},
      ${observabilityMode}, false, ${checked(formData.get("acknowledge"))},
      ${profile.id}, now()
    )
    on conflict (organization_id) do update set
      evidence_storage_mode=excluded.evidence_storage_mode,
      ai_mode=excluded.ai_mode,
      ai_provider=excluded.ai_provider,
      vng_status=case when excluded.evidence_storage_mode='vng_cloud' then
        case when organization_data_policies.vng_status='configured' then 'configured' else 'requested' end
        else 'not_requested' end,
      observability_mode=excluded.observability_mode,
      raw_student_content_tracing=false,
      partner_acknowledged_data_responsibility=excluded.partner_acknowledged_data_responsibility,
      configured_by=excluded.configured_by,
      configured_at=now(),
      updated_at=now()
  `;

  revalidatePath("/workspace/partner/data-control");
  revalidatePath("/workspace/partner/community");
}
