"use server";
import { revalidatePath } from "next/cache";
import { requirePartnerOrganizationAccess, isUuidReference } from "@/lib/auth/authorization";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { privacySchemaReady } from "@/lib/privacy/access";
import { DEPLOYMENT_MODES, PRIVACY_POLICY_VERSION } from "@/lib/privacy/policy";
function text(form:FormData,key:string,max=500){return String(form.get(key)||"").trim().slice(0,max);}
function organization(form:FormData){const value=text(form,"organizationId");if(!isUuidReference(value))throw Error("invalid_organization_reference");return value;}
export async function submitSchoolAgreement(form:FormData){
  const organizationId=organization(form);const {profile}=await requirePartnerOrganizationAccess(organizationId);
  if(!await privacySchemaReady())throw Error("privacy_workflow_not_configured");
  if(form.get("authorized")!=="on"||form.get("policyVersion")!==PRIVACY_POLICY_VERSION)throw Error("institution_authorization_required");
  const mode=text(form,"deploymentMode");if(!(DEPLOYMENT_MODES as readonly string[]).includes(mode))throw Error("invalid_deployment_mode");
  const fields=['schoolLegalName','schoolContact','vitechContact','processingCountries','approvedProviders','retentionSchedule','agreementReference','privacyReviewReference'].map(k=>text(form,k,1500));
  if(fields.some(v=>v.length<5))throw Error("complete_processing_disclosure_required");
  const sql=getDb();await sql.transaction(txn=>[
    txn`insert into school_processing_agreements(organization_id,policy_version,deployment_mode,school_legal_name,school_contact,vitech_contact,processing_countries,approved_providers,retention_schedule,agreement_reference,privacy_review_reference,cross_border_reference,requested_by)
      values(${organizationId},${PRIVACY_POLICY_VERSION},${mode},${fields[0]},${fields[1]},${fields[2]},${fields[3]},${fields[4]},${fields[5]},${fields[6]},${fields[7]},${text(form,'crossBorderReference')||null},${profile.id})
      on conflict(organization_id) do update set policy_version=excluded.policy_version,deployment_mode=excluded.deployment_mode,school_legal_name=excluded.school_legal_name,
        school_contact=excluded.school_contact,vitech_contact=excluded.vitech_contact,processing_countries=excluded.processing_countries,approved_providers=excluded.approved_providers,
        retention_schedule=excluded.retention_schedule,agreement_reference=excluded.agreement_reference,privacy_review_reference=excluded.privacy_review_reference,cross_border_reference=excluded.cross_border_reference,
        requested_by=excluded.requested_by,status='submitted',reviewed_by=null,reviewed_at=null,updated_at=now()`,
    txn`update optional_processing_consents set withdrawn_at=now(),updated_at=now() where organization_id=${organizationId}`,
    txn`update learner_consent_records set status='revoked',revoked_at=now() where organization_id=${organizationId} and status='active'`,
    txn`insert into privacy_governance_events(organization_id,actor_id,action) values(${organizationId},${profile.id},'agreement_submitted')`,
  ]);revalidatePath('/workspace/partner/privacy-governance');
}
export async function reviewSchoolAgreement(form:FormData){
  const organizationId=organization(form);const {profile}=await requirePlatformAdmin();
  if(!await privacySchemaReady())throw Error("privacy_workflow_not_configured");
  const approve=form.get('decision')==='approve';
  if(approve&&process.env.CCJ_CHILD_DATA_GOVERNANCE_APPROVED!=="true")throw Error('children_data_review_not_signed_off');
  const rows=await getDb()`with changed as (
    update school_processing_agreements set status=${approve?'approved':'suspended'},reviewed_by=${profile.id},reviewed_at=now(),updated_at=now()
    where organization_id=${organizationId} and (${approve}=false or requested_by<>${profile.id})
      and (${approve}=false or (policy_version=${PRIVACY_POLICY_VERSION} and deployment_mode='vitech_managed_cloud')) returning organization_id
    ) insert into privacy_governance_events(organization_id,actor_id,action)
      select organization_id,${profile.id},${approve?'agreement_approved':'agreement_suspended'} from changed returning organization_id`;
  if(!rows[0])throw Error('independent_supported_deployment_review_required');
  revalidatePath('/workspace/partner/privacy-governance');
}
export async function reviewPrivacyRightsRequest(form:FormData){
  const organizationId=organization(form);const {profile}=await requirePartnerOrganizationAccess(organizationId);
  if(!await privacySchemaReady())throw Error("privacy_workflow_not_configured");
  const requestId=text(form,'requestId'),status=text(form,'status'),ref=text(form,'executionReference');
  if(!isUuidReference(requestId)||!['acknowledged','in_review','completed','lawful_hold'].includes(status))throw Error('invalid_rights_review');
  if(['completed','lawful_hold'].includes(status)&&ref.length<5)throw Error('execution_or_legal_hold_evidence_required');
  const sql=getDb();const result=await sql.transaction(txn=>[
    txn`update privacy_rights_requests set status=${status},execution_reference=${ref||null},updated_at=now() where id=${requestId} and organization_id=${organizationId} returning id`,
    txn`insert into privacy_governance_events(organization_id,actor_id,action) select organization_id,${profile.id},'rights_updated' from privacy_rights_requests where id=${requestId} and organization_id=${organizationId}`,
  ]);if(!result[0]?.[0])throw Error('rights_request_not_found');
  revalidatePath('/workspace/partner/privacy-governance');revalidatePath('/workspace/privacy');
}
