"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getManagedOrganization } from "@/lib/integration-runtime";
import {
  deliverJuniorInvitation,
  parseJuniorRequestPayload,
  stringifyJuniorRequestPayload,
  VSTJ_ALLOWED_GRADES,
  VSTJ_PARTNER_NOTICE,
  VSTJ_PRIVACY_VERSION,
  VSTJ_TERMS_VERSION,
} from "@/lib/vinaskilltrust-junior";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function boundedText(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "yes";
}

function validateGrades(values: string[]) {
  const grades = Array.from(new Set(values.filter((grade) => (VSTJ_ALLOWED_GRADES as readonly string[]).includes(grade))));
  if (grades.length === 0) throw new Error("Select Grade 11 and/or Grade 12. VinaSkillTrust Junior is not available for younger grades.");
  return grades;
}

async function requireIndustryConnector(organizationId: string) {
  const access = await getManagedOrganization(organizationId);
  if (!access) throw new Error("Partner administrator access required.");

  if (access.profile.account_type !== "platform_admin") {
    const sql = getDb();
    const rows = await sql`
      select enabled
      from organization_features
      where organization_id=${organizationId}
        and feature_key='industry_connector'
      limit 1
    `;
    if (!rows[0]?.enabled) throw new Error("VinaSkillTrust Junior has not been enabled for this institution.");
  }
  return access;
}

export async function requestCompanyConnection(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const companyName = boundedText(formData.get("companyName"), 180);
  const companyWebsite = boundedText(formData.get("companyWebsite"), 500);
  const companyEmail = boundedText(formData.get("companyEmail"), 254).toLowerCase();
  const contactName = boundedText(formData.get("contactName"), 120);
  const sector = boundedText(formData.get("sector"), 120);
  const message = boundedText(formData.get("note"), 3000);
  const collaborationTypes = formData.getAll("collaborationTypes").map(String).filter((item) =>
    ["career_talk","role_profiles","skills_briefing","work_simulation","project_brief","mentoring","site_visit"].includes(item),
  );
  const grades = validateGrades(formData.getAll("grades").map(String));

  if (!UUID_RE.test(organizationId) || companyName.length < 2) {
    throw new Error("Organization and company name are required.");
  }
  if (!/^\S+@\S+\.\S+$/.test(companyEmail)) {
    throw new Error("A valid public company or authorized business email is required.");
  }
  if (companyWebsite) {
    try {
      const url = new URL(companyWebsite);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("bad protocol");
    } catch {
      throw new Error("Company website must be a valid http(s) URL.");
    }
  }

  const agreementOk =
    checked(formData, "agreeTerms") &&
    checked(formData, "agreeSchoolResponsibility") &&
    checked(formData, "agreeBridgeRole") &&
    checked(formData, "agreeModeration") &&
    checked(formData, "agreeGrades");
  if (!agreementOk) {
    throw new Error("Accept the current VinaSkillTrust Junior Terms, Privacy Notice and Grade 11–12 safeguards before sending a company request.");
  }

  const access = await requireIndustryConnector(organizationId);
  const sql = getDb();
  const requestPayload = {
    message,
    companyEmail,
    contactName,
    grades,
    agreement: {
      termsVersion: VSTJ_TERMS_VERSION,
      privacyVersion: VSTJ_PRIVACY_VERSION,
      acceptedAt: new Date().toISOString(),
      schoolResponsibility: true as const,
      bridgeOnly: true as const,
      moderation: true as const,
      gradesOnly: true as const,
    },
  };

  const inserted = await sql`
    insert into industry_connection_requests (
      organization_id, requested_by, company_name, company_website, sector, collaboration_types, note, status
    )
    values (
      ${organizationId}, ${access.profile.id}, ${companyName}, ${companyWebsite || null}, ${sector || null},
      ${collaborationTypes}, ${stringifyJuniorRequestPayload(requestPayload)}, 'pending'
    )
    returning id
  `;
  const requestId = String(inserted[0]?.id || "");
  if (!requestId) throw new Error("Could not create the company connection request.");

  const delivery = await deliverJuniorInvitation({
    requestId,
    companyEmail,
    contactName,
    companyName,
    organizationName: access.organization.name,
    grades,
    message,
  });

  const finalPayload = {
    ...requestPayload,
    invitation: {
      deliveryStatus: delivery.status,
      sentAt: delivery.status === "sent" ? new Date().toISOString() : undefined,
      lastAttemptAt: new Date().toISOString(),
    },
  };
  await sql`
    update industry_connection_requests
    set note=${stringifyJuniorRequestPayload(finalPayload)}, updated_at=now()
    where id=${requestId}
  `;

  revalidatePath("/workspace/partner/industry-connect");
  revalidatePath("/workspace/admin");
}

export async function requestVerifiedCompany(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const industryPartnerId = String(formData.get("industryPartnerId") || "");
  const requestNote = boundedText(formData.get("requestNote"), 1000);
  const grades = validateGrades(formData.getAll("grades").map(String));

  if (!UUID_RE.test(organizationId) || !UUID_RE.test(industryPartnerId)) {
    throw new Error("Invalid company connection request.");
  }
  if (!checked(formData, "agreeGrades")) {
    throw new Error("Confirm that this connection is only for Grade 11 and/or Grade 12 learners.");
  }

  const access = await requireIndustryConnector(organizationId);
  const sql = getDb();
  const partner = await sql`select id from industry_partners where id=${industryPartnerId} and status='verified' limit 1`;
  if (!partner[0]) throw new Error("Verified company profile not found.");

  const note = JSON.stringify({
    message: requestNote,
    grades,
    termsVersion: VSTJ_TERMS_VERSION,
    privacyVersion: VSTJ_PRIVACY_VERSION,
    grade11to12Only: true,
  });

  await sql`
    insert into school_company_connections (
      organization_id, industry_partner_id, status, requested_by, request_note
    )
    values (${organizationId}, ${industryPartnerId}, 'requested', ${access.profile.id}, ${note})
    on conflict (organization_id, industry_partner_id) do update set
      status='requested', requested_by=excluded.requested_by, request_note=excluded.request_note, updated_at=now()
  `;
  revalidatePath("/workspace/partner/industry-connect");
  revalidatePath("/workspace/admin");
}

export async function resendJuniorInvitationForPartner(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const requestId = String(formData.get("requestId") || "");
  if (!UUID_RE.test(organizationId) || !UUID_RE.test(requestId)) throw new Error("Invalid invitation request.");

  const access = await requireIndustryConnector(organizationId);
  const sql = getDb();
  const rows = await sql`
    select id, company_name, note
    from industry_connection_requests
    where id=${requestId} and organization_id=${organizationId}
    limit 1
  `;
  const row = rows[0];
  const payload = parseJuniorRequestPayload(row?.note);
  if (!row || !payload) throw new Error("VinaSkillTrust Junior request not found.");

  const delivery = await deliverJuniorInvitation({
    requestId,
    companyEmail: payload.companyEmail,
    contactName: payload.contactName,
    companyName: String(row.company_name),
    organizationName: access.organization.name,
    grades: payload.grades,
    message: payload.message,
  });
  payload.invitation = {
    deliveryStatus: delivery.status,
    sentAt: delivery.status === "sent" ? new Date().toISOString() : payload.invitation?.sentAt,
    lastAttemptAt: new Date().toISOString(),
  };
  await sql`update industry_connection_requests set note=${stringifyJuniorRequestPayload(payload)}, updated_at=now() where id=${requestId}`;
  revalidatePath("/workspace/partner/industry-connect");
}

export { VSTJ_PARTNER_NOTICE };
