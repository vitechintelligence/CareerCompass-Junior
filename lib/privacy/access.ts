import "server-only";
import { getDb } from "@/lib/db";
import { isUuidReference } from "@/lib/auth/authorization-policy";
import { PRIVACY_POLICY_VERSION, type OptionalPurpose } from "@/lib/privacy/policy";

export async function privacySchemaReady() {
  const rows = await getDb()`select to_regclass('public.school_processing_agreements') is not null
    and to_regclass('public.learner_representative_authorities') is not null
    and to_regclass('public.optional_processing_consents') is not null
    and to_regclass('public.privacy_rights_requests') is not null
    and to_regclass('public.privacy_consent_events') is not null
    and to_regclass('public.privacy_governance_events') is not null
    and to_regclass('public.learner_consent_records') is not null
    and to_regclass('public.guardian_report_links') is not null as ready`;
  return rows[0]?.ready === true;
}
export async function requireSchoolAgreement(organizationId: string, remoteAi = false) {
  if(process.env.CCJ_CHILD_DATA_GOVERNANCE_APPROVED!=="true")throw new Error("school_processing_not_approved");
  if (!isUuidReference(organizationId) || !await privacySchemaReady()) throw new Error("school_processing_not_approved");
  const rows = await getDb()`select a.organization_id from school_processing_agreements a
    join organizations o on o.id=a.organization_id and o.status='active'
    join profiles reviewer on reviewer.id=a.reviewed_by and reviewer.status='active' and reviewer.account_type='platform_admin'
    where a.organization_id=${organizationId} and a.status='approved' and a.policy_version=${PRIVACY_POLICY_VERSION}
      and a.reviewed_by<>a.requested_by and a.deployment_mode='vitech_managed_cloud'
      and (${remoteAi}=false or (length(trim(coalesce(a.cross_border_reference,'')))>=5 and exists (
        select 1 from organization_data_policies p where p.organization_id=a.organization_id
          and p.evidence_storage_mode='platform_metadata' and p.ai_mode='platform_managed'
          and p.partner_acknowledged_data_responsibility=true))) limit 1`;
  if (!rows[0]) throw new Error("school_processing_not_approved");
}
export async function optionalProcessingAllowed(organizationId: string, learnerId: string, purpose: OptionalPurpose, recipientId?: string) {
  if(process.env.CCJ_CHILD_DATA_GOVERNANCE_APPROVED!=="true")return false;
  if (![organizationId,learnerId,...(recipientId?[recipientId]:[])].every(isUuidReference)) return false;
  if (!await privacySchemaReady()) return false;
  const rows = await getDb()`select c.id from optional_processing_consents c
    join learner_representative_authorities a on a.id=c.authority_id and a.organization_id=c.organization_id and a.learner_id=c.learner_id
    join profiles learner on learner.id=c.learner_id and learner.status='active' and learner.account_type='student'
    join profiles representative on representative.id=a.representative_profile_id and representative.status='active'
    join organizations o on o.id=c.organization_id and o.status='active'
    join organization_memberships om on om.organization_id=c.organization_id and om.profile_id=c.learner_id and om.role='student' and om.status='active'
    join school_processing_agreements agreement on agreement.organization_id=c.organization_id
    join profiles reviewer on reviewer.id=agreement.reviewed_by and reviewer.account_type='platform_admin' and reviewer.status='active'
    where c.organization_id=${organizationId} and c.learner_id=${learnerId} and c.purpose=${purpose}
      and c.policy_version=${PRIVACY_POLICY_VERSION} and c.learner_signed_at is not null and c.representative_signed_at is not null and c.withdrawn_at is null
      and a.status='active' and a.revoked_at is null and a.verified_by<>a.learner_id and a.verified_by<>a.representative_profile_id
      and agreement.status='approved' and agreement.policy_version=${PRIVACY_POLICY_VERSION}
      and agreement.reviewed_by<>agreement.requested_by and agreement.deployment_mode='vitech_managed_cloud'
      and (${recipientId??null}::uuid is null or a.representative_profile_id=${recipientId??null}::uuid) limit 1`;
  return Boolean(rows[0]);
}
export async function requireOptionalProcessing(organizationId: string, learnerId: string, purpose: OptionalPurpose, recipientId?: string) {
  if (!await optionalProcessingAllowed(organizationId,learnerId,purpose,recipientId)) throw new Error("current_family_consent_required");
}
export async function requireAdultSyntheticPilot(profileId: string, organizationId: string, feature: string, classId?: string) {
  if (![profileId,organizationId,...(classId?[classId]:[])].every(isUuidReference)) throw new Error("adult_synthetic_pilot_required");
  const sql=getDb();
  const schema=await sql`select to_regclass('public.adult_synthetic_pilot_accounts') is not null and to_regclass('public.feature_pilot_scopes') is not null as ready`;
  if (!schema[0]?.ready) throw new Error("adult_synthetic_pilot_required");
  const rows=await sql`select cm.class_id from adult_synthetic_pilot_accounts a
    join profiles learner on learner.id=a.profile_id and learner.status='active' and learner.account_type='student'
    join profiles verifier on verifier.id=a.verified_by and verifier.account_type='platform_admin' and verifier.status='active'
    join class_memberships cm on cm.student_id=a.profile_id and cm.status='active'
    join classes c on c.id=cm.class_id and c.organization_id=${organizationId} and c.status='active'
    join organization_memberships om on om.profile_id=a.profile_id and om.organization_id=c.organization_id and om.status='active' and om.role='student'
    join organizations o on o.id=c.organization_id and o.status='active'
    join feature_pilot_scopes f on f.class_id=c.id and f.organization_id=c.organization_id and f.feature_key=${feature}
    join profiles approver on approver.id=f.approved_by and approver.status='active' and approver.account_type='platform_admin'
    where a.profile_id=${profileId} and a.verified_by<>a.profile_id and a.expires_at>now()
      and f.enabled=true and f.expires_at>now() and (${classId??null}::uuid is null or c.id=${classId??null}::uuid) limit 1`;
  if (!rows[0]) throw new Error("adult_synthetic_pilot_required");
}
