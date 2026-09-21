"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getManagedOrganization } from "@/lib/integration-runtime";
import { sendVstJuniorInvitation } from "@/lib/vst-junior-email";
import {
  VST_JUNIOR_ELIGIBILITY_VERSION,
  VST_JUNIOR_PRIVACY_VERSION,
  VST_JUNIOR_TERMS_VERSION,
} from "@/lib/vst-junior-terms";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function boundedText(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

function selectedGrades(formData: FormData) {
  const grades = Array.from(new Set(formData.getAll("targetGrades").map(String).filter((grade) => grade === "11" || grade === "12")));
  if (grades.length === 0) throw new Error("VinaSkillTrust Junior is restricted to Grade 11 and Grade 12. Select at least one eligible grade.");
  return grades;
}

function requireAgreement(formData: FormData) {
  const required = ["gradeEligibility", "dataResponsibility", "bridgeRole", "moderation"];
  if (!required.every((key) => formData.get(key) === "yes")) {
    throw new Error("Accept all current VinaSkillTrust Junior Terms, Privacy, Grade 11–12 and moderation acknowledgements.");
  }
}

async function requireVstJuniorOrganization(organizationId: string) {
  if (!UUID_RE.test(organizationId)) throw new Error("Invalid organization.");
  const access = await getManagedOrganization(organizationId);
  if (!access) throw new Error("Partner administrator access required.");

  const sql = getDb();
  const feature = await sql`
    select 1
    from organization_features
    where organization_id=${organizationId}
      and feature_key='industry_connector'
      and enabled=true
    limit 1
  `;
  if (!feature[0]) throw new Error("VinaSkillTrust Junior is not enabled for this institution.");
  return access;
}

async function recordAgreement(
  organizationId: string,
  profileId: string,
  requestId: string | null,
) {
  const sql = getDb();
  await sql`
    insert into vst_junior_agreement_acceptances (
      organization_id, profile_id, request_id,
      terms_version, privacy_version, eligibility_version,
      grade_eligibility_confirmed, data_responsibility_confirmed,
      bridge_role_confirmed, moderation_confirmed
    )
    values (
      ${organizationId}, ${profileId}, ${requestId},
      ${VST_JUNIOR_TERMS_VERSION}, ${VST_JUNIOR_PRIVACY_VERSION}, ${VST_JUNIOR_ELIGIBILITY_VERSION},
      true, true, true, true
    )
  `;
}

export async function requestCompanyConnection(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const companyName = boundedText(formData.get("companyName"), 180);
  const companyWebsite = boundedText(formData.get("companyWebsite"), 500);
  const companyEmail = boundedText(formData.get("companyEmail"), 254).toLowerCase();
  const companyContactName = boundedText(formData.get("companyContactName"), 160);
  const sector = boundedText(formData.get("sector"), 120);
  const note = boundedText(formData.get("note"), 3000);
  const targetGrades = selectedGrades(formData);
  requireAgreement(formData);

  const collaborationTypes = formData
    .getAll("collaborationTypes")
    .map(String)
    .filter((item) =>
      ["career_talk","role_profiles","skills_briefing","work_simulation","project_brief","mentoring","site_visit"].includes(item),
    );

  if (companyName.length < 2) throw new Error("Company name is required.");
  if (!EMAIL_RE.test(companyEmail)) throw new Error("A valid official company email is required.");
  if (companyWebsite) {
    try {
      const url = new URL(companyWebsite);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("bad protocol");
    } catch {
      throw new Error("Company website must be a valid http(s) URL.");
    }
  }

  const access = await requireVstJuniorOrganization(organizationId);
  const sql = getDb();

  const requestRows = await sql`
    insert into industry_connection_requests (
      organization_id, requested_by, company_name, company_website, company_email,
      company_contact_name, sector, collaboration_types, note, target_grades,
      terms_version, privacy_version, eligibility_version,
      delivery_status, company_response_status, status
    )
    values (
      ${organizationId}, ${access.profile.id}, ${companyName}, ${companyWebsite || null}, ${companyEmail},
      ${companyContactName || null}, ${sector || null}, ${collaborationTypes}, ${note || null}, ${targetGrades},
      ${VST_JUNIOR_TERMS_VERSION}, ${VST_JUNIOR_PRIVACY_VERSION}, ${VST_JUNIOR_ELIGIBILITY_VERSION},
      'queued', 'awaiting', 'pending'
    )
    returning id
  `;
  const requestId = String(requestRows[0]?.id || "");
  if (!requestId) throw new Error("Could not create the company connection request.");

  await recordAgreement(organizationId, access.profile.id, requestId);

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitationRows = await sql`
    insert into vst_junior_company_invitations (
      request_id, token_hash, company_email, expires_at, delivery_status
    )
    values (${requestId}, ${tokenHash}, ${companyEmail}, now() + interval '14 days', 'queued')
    returning id
  `;
  const invitationId = String(invitationRows[0]?.id || "");
  if (!invitationId) throw new Error("Could not create the secure company invitation.");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  const mailResult = appUrl
    ? await sendVstJuniorInvitation({
        to: companyEmail,
        companyName,
        institutionName: access.organization.name,
        inviteUrl: `${appUrl}/company-invite/${token}`,
        collaborationTypes,
        note,
      })
    : { status: "failed" as const, error: "NEXT_PUBLIC_APP_URL is not configured." };

  if (mailResult.status === "sent") {
    await sql`
      update vst_junior_company_invitations
      set delivery_status='sent', provider_message_id=${mailResult.providerMessageId || null},
          delivery_error=null, sent_at=now()
      where id=${invitationId}
    `;
    await sql`
      update industry_connection_requests
      set delivery_status='sent', last_invited_at=now(), updated_at=now()
      where id=${requestId}
    `;
  } else {
    await sql`
      update vst_junior_company_invitations
      set delivery_status='failed', delivery_error=${mailResult.error || "Email delivery failed."}
      where id=${invitationId}
    `;
    await sql`
      update industry_connection_requests
      set delivery_status='failed', last_invited_at=now(), updated_at=now()
      where id=${requestId}
    `;
  }

  revalidatePath("/workspace/partner/industry-connect");
  revalidatePath("/workspace/admin");
}

export async function requestVerifiedCompany(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const industryPartnerId = String(formData.get("industryPartnerId") || "");
  const requestNote = boundedText(formData.get("requestNote"), 1000);
  const targetGrades = selectedGrades(formData);
  requireAgreement(formData);

  if (!UUID_RE.test(industryPartnerId)) throw new Error("Invalid company connection request.");
  const access = await requireVstJuniorOrganization(organizationId);
  const sql = getDb();
  const partner = await sql`
    select id from industry_partners
    where id=${industryPartnerId} and status='verified'
    limit 1
  `;
  if (!partner[0]) throw new Error("Verified company profile not found.");

  await sql`
    insert into school_company_connections (
      organization_id, industry_partner_id, status, requested_by, request_note,
      target_grades, terms_version, privacy_version, eligibility_version
   )
    values (
      ${organizationId}, ${industryPartnerId}, 'requested', ${access.profile.id}, ${requestNote || null},
      ${targetGrades}, ${VST_JUNIOR_TERMS_VERSION}, ${VST_JUNIOR_PRIVACY_VERSION}, ${VST_JUNIOR_ELIGIBILITY_VERSION}
    )
    on conflict (organization_id, industry_partner_id) do update set
      status='requested', requested_by=excluded.requested_by, request_note=excluded.request_note,
      target_grades=excluded.target_grades, terms_version=excluded.terms_version,
      privacy_version=excluded.privacy_version, eligibility_version=excluded.eligibility_version,
      updated_at=now()
  `;

  await recordAgreement(organizationId, access.profile.id, null);
  revalidatePath("/workspace/partner/industry-connect");
  revalidatePath("/workspace/admin");
}
