"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getManagedOrganization } from "@/lib/integration-runtime";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function boundedText(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

export async function requestCompanyConnection(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const companyName = boundedText(formData.get("companyName"), 180);
  const companyWebsite = boundedText(formData.get("companyWebsite"), 500);
  const sector = boundedText(formData.get("sector"), 120);
  const note = boundedText(formData.get("note"), 3000);
  const collaborationTypes = formData.getAll("collaborationTypes").map(String).filter((item) => ["career_talk","role_profiles","skills_briefing","work_simulation","project_brief","mentoring","site_visit"].includes(item));

  if (!UUID_RE.test(organizationId) || companyName.length < 2) throw new Error("Organization and company name are required.");
  if (companyWebsite) {
    try {
      const url = new URL(companyWebsite);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("bad protocol");
    } catch { throw new Error("Company website must be a valid http(s) URL."); }
  }

  const access = await getManagedOrganization(organizationId);
  if (!access) throw new Error("Partner administrator access required.");
  const sql = getDb();
  await sql`
    insert into industry_connection_requests (
      organization_id, requested_by, company_name, company_website, sector, collaboration_types, note, status
    )
    values (
      ${organizationId}, ${access.profile.id}, ${companyName}, ${companyWebsite || null}, ${sector || null}, ${collaborationTypes}, ${note || null}, 'pending'
    )
  `;

  revalidatePath("/workspace/partner/industry-connect");
}

export async function requestVerifiedCompany(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const industryPartnerId = String(formData.get("industryPartnerId") || "");
  const requestNote = boundedText(formData.get("requestNote"), 1000);
  if (!UUID_RE.test(organizationId) || !UUID_RE.test(industryPartnerId)) throw new Error("Invalid company connection request.");

  const access = await getManagedOrganization(organizationId);
  if (!access) throw new Error("Partner administrator access required.");
  const sql = getDb();
  const partner = await sql`select id from industry_partners where id=${industryPartnerId} and status='verified' limit 1`;
  if (!partner[0]) throw new Error("Verified company profile not found.");

  await sql`
    insert into school_company_connections (
      organization_id, industry_partner_id, status, requested_by, request_note
    )
    values (${organizationId}, ${industryPartnerId}, 'requested', ${access.profile.id}, ${requestNote || null})
    on conflict (organization_id, industry_partner_id) do update set
      status='requested', requested_by=excluded.requested_by, request_note=excluded.request_note, updated_at=now()
  `;
  revalidatePath("/workspace/partner/industry-connect");
}
