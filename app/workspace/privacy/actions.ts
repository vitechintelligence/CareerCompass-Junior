"use server";
import { revalidatePath } from "next/cache";
import { requireActiveProfile, requirePartnerOrganizationAccess, isUuidReference } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { privacySchemaReady, requireSchoolAgreement } from "@/lib/privacy/access";
import { PRIVACY_POLICY_VERSION, isOptionalPurpose, type OptionalPurpose } from "@/lib/privacy/policy";

function v(form:FormData,key:string,max=100){return String(form.get(key)||"").trim().slice(0,max);}
function id(form:FormData,key:string){const value=v(form,key);if(!isUuidReference(value))throw Error("invalid_privacy_reference");return value;}
function checked(form:FormData,key:string){return form.get(key)==="on"||form.get(key)==="true";}
async function subject(form:FormData){
  const actor=await requireActiveProfile(["student","teacher","partner_admin","platform_admin"]);
  const organizationId=id(form,"organizationId"), learnerId=id(form,"learnerId");
  if(!await privacySchemaReady())throw Error("privacy_workflow_not_configured");
  const rows=await getDb()`select p.id from profiles p where p.id=${learnerId} and p.account_type='student'
    and exists(select 1 from organization_memberships om where om.profile_id=p.id and om.organization_id=${organizationId} and om.role='student')
    and (p.id=${actor.id} or exists(select 1 from learner_representative_authorities a
      where a.learner_id=p.id and a.organization_id=${organizationId} and a.representative_profile_id=${actor.id} and a.status='active' and a.revoked_at is null)) limit 1`;
  if(!rows[0])throw Error("privacy_subject_not_authorized");
  return {actor,organizationId,learnerId};
}
export async function recordOptionalConsent(form:FormData){
  const {actor,organizationId,learnerId}=await subject(form);
  const purpose=v(form,"purpose");if(!isOptionalPurpose(purpose))throw Error("invalid_processing_purpose");
  if(form.get("decision")==="withdraw"){await withdraw(organizationId,learnerId,actor.id,purpose);return;}
  if(purpose==="capsule_exchange"||purpose==="industry_network")throw Error("recipient_exchange_not_connected");
  if(v(form,"policyVersion")!==PRIVACY_POLICY_VERSION||!checked(form,"agree"))throw Error("explicit_current_consent_required");
  await requireSchoolAgreement(organizationId,purpose==="ai_assistive_features");
  const authorityId=id(form,"authorityId");const sql=getDb();
  const authorities=await sql`select a.id from learner_representative_authorities a
    join profiles p on p.id=a.learner_id and p.status='active'
    join profiles r on r.id=a.representative_profile_id and r.status='active'
    where a.id=${authorityId} and a.organization_id=${organizationId} and a.learner_id=${learnerId} and a.status='active' and a.revoked_at is null
      and (a.learner_id=${actor.id} or a.representative_profile_id=${actor.id}) limit 1`;
  if(!authorities[0])throw Error("verified_representative_required");
  const learner=actor.id===learnerId;
  await sql.transaction(txn=>[
    txn`insert into optional_processing_consents(organization_id,learner_id,authority_id,purpose,policy_version,learner_signed_at,representative_signed_at)
      values(${organizationId},${learnerId},${authorityId},${purpose},${PRIVACY_POLICY_VERSION},case when ${learner} then now() else null end,case when ${learner}=false then now() else null end)
      on conflict(organization_id,learner_id,purpose) do update set
        authority_id=excluded.authority_id, policy_version=excluded.policy_version, withdrawn_at=null, updated_at=now(),
        learner_signed_at=case when ${learner} then now() when optional_processing_consents.authority_id=excluded.authority_id
          and optional_processing_consents.policy_version=excluded.policy_version and optional_processing_consents.withdrawn_at is null then optional_processing_consents.learner_signed_at else null end,
        representative_signed_at=case when ${learner}=false then now() when optional_processing_consents.authority_id=excluded.authority_id
          and optional_processing_consents.policy_version=excluded.policy_version and optional_processing_consents.withdrawn_at is null then optional_processing_consents.representative_signed_at else null end`,
    txn`insert into privacy_consent_events(organization_id,learner_id,actor_id,purpose,policy_version,action) values(${organizationId},${learnerId},${actor.id},${purpose},${PRIVACY_POLICY_VERSION},'agree')`,
  ]);
  revalidatePath("/workspace/privacy");
}
async function withdraw(organizationId:string,learnerId:string,actorId:string,purpose:OptionalPurpose){
  const sql=getDb();await sql.transaction(txn=>[
    txn`update optional_processing_consents set withdrawn_at=now(),updated_at=now() where organization_id=${organizationId} and learner_id=${learnerId} and purpose=${purpose}`,
    txn`update learner_consent_records set status='revoked',revoked_at=now() where organization_id=${organizationId} and learner_id=${learnerId} and consent_type=${purpose} and status='active'`,
    txn`insert into privacy_consent_events(organization_id,learner_id,actor_id,purpose,policy_version,action) values(${organizationId},${learnerId},${actorId},${purpose},${PRIVACY_POLICY_VERSION},'withdraw')`,
  ]);revalidatePath("/workspace/privacy");
}
export async function submitPrivacyRightsRequest(form:FormData){
  const {actor,organizationId,learnerId}=await subject(form);
  const type=v(form,"requestType");if(!['access','correction','restriction','objection','withdrawal','deletion'].includes(type))throw Error("invalid_privacy_request");
  const sql=getDb();await sql.transaction(txn=>[
    txn`insert into privacy_rights_requests(organization_id,learner_id,requested_by,request_type) values(${organizationId},${learnerId},${actor.id},${type})`,
    txn`update optional_processing_consents set withdrawn_at=now(),updated_at=now() where organization_id=${organizationId} and learner_id=${learnerId} and ${['restriction','objection','withdrawal'].includes(type)}=true`,
    txn`update learner_consent_records set status='revoked',revoked_at=now() where organization_id=${organizationId} and learner_id=${learnerId} and status='active' and ${['restriction','objection','withdrawal'].includes(type)}=true`,
  ]);revalidatePath("/workspace/privacy");
}
export async function verifyRepresentative(form:FormData){
  const organizationId=id(form,"organizationId"),learnerId=id(form,"learnerId"),representativeId=id(form,"representativeId");
  const {profile}=await requirePartnerOrganizationAccess(organizationId);
  if(!await privacySchemaReady())throw Error("privacy_workflow_not_configured");
  const ref=v(form,"evidenceReference",250);
  if(ref.length<5||!checked(form,"verifiedAuthority")||!checked(form,"verifiedAdult")||profile.id===learnerId||profile.id===representativeId||learnerId===representativeId)throw Error("independent_authority_verification_required");
  const sql=getDb();const rows=await sql`select p.id from profiles p join organization_memberships om on om.profile_id=p.id
    join organizations o on o.id=om.organization_id and o.status='active'
    where p.id=${learnerId} and p.account_type='student' and p.status='active' and om.organization_id=${organizationId} and om.role='student' and om.status='active'
      and exists(select 1 from profiles r where r.id=${representativeId} and r.status='active') limit 1`;
  if(!rows[0])throw Error("active_privacy_subject_required");
  await sql.transaction(txn=>[
    txn`insert into learner_representative_authorities(organization_id,learner_id,representative_profile_id,evidence_reference,verified_by,status)
      values(${organizationId},${learnerId},${representativeId},${ref},${profile.id},'active') on conflict(organization_id,learner_id,representative_profile_id) do update set evidence_reference=excluded.evidence_reference,verified_by=excluded.verified_by,verified_at=now(),status='active',revoked_at=null`,
    txn`update optional_processing_consents c set withdrawn_at=now(),updated_at=now() where c.organization_id=${organizationId} and c.learner_id=${learnerId}
      and exists(select 1 from learner_representative_authorities a where a.id=c.authority_id and a.representative_profile_id=${representativeId})`,
    txn`insert into privacy_consent_events(organization_id,learner_id,actor_id,purpose,policy_version,action) values(${organizationId},${learnerId},${profile.id},'representative_authority',${PRIVACY_POLICY_VERSION},'authority_verified')`,
  ]);revalidatePath("/workspace/partner/privacy-governance");
}
export async function revokeRepresentative(form:FormData){
  const organizationId=id(form,"organizationId"),authorityId=id(form,"authorityId");
  const {profile}=await requirePartnerOrganizationAccess(organizationId);
  const sql=getDb();if(!await privacySchemaReady())throw Error("privacy_workflow_not_configured");
  await sql.transaction(txn=>[
    txn`update learner_representative_authorities set status='revoked',revoked_at=now() where id=${authorityId} and organization_id=${organizationId}`,
    txn`update optional_processing_consents set withdrawn_at=now(),updated_at=now() where authority_id=${authorityId} and organization_id=${organizationId}`,
    txn`update guardian_report_links g set status='revoked',revoked_at=now() where g.organization_id=${organizationId} and exists(select 1 from learner_representative_authorities a where a.id=${authorityId} and a.organization_id=g.organization_id and a.learner_id=g.learner_id and a.representative_profile_id=g.guardian_profile_id)`,
    txn`insert into privacy_consent_events(organization_id,learner_id,actor_id,purpose,policy_version,action) select organization_id,learner_id,${profile.id},'representative_authority',${PRIVACY_POLICY_VERSION},'authority_revoked' from learner_representative_authorities where id=${authorityId} and organization_id=${organizationId}`,
  ]);revalidatePath("/workspace/partner/privacy-governance");revalidatePath("/workspace/privacy");
}
