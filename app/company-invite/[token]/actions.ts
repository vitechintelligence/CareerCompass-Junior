"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

function bounded(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function allowedGrades(values: string[]) {
  const grades = Array.from(new Set(values.filter((value) => value === "11" || value === "12")));
  if (grades.length === 0) throw new Error("A Grade 11 or Grade 12 target is required.");
  return grades;
}

async function invitationForToken(token: string) {
  if (token.length < 32 || token.length > 200) return null;
  const sql = getDb();
  const rows = await sql`
    select i.id as invitation_id, i.request_id, i.expires_at, i.response_status,
           r.organization_id, r.company_name, r.company_website, r.sector, r.industry_partner_id,
           r.target_grades, o.name as organization_name
    from vst_junior_company_invitations i
    join industry_connection_requests r on r.id=i.request_id
    join organizations o on o.id=r.organization_id
    where i.token_hash=${hashToken(token)}
    limit 1
  `;
  return rows[0] || null;
}

export async function respondToVstJuniorInvitation(formData: FormData) {
  const token = bounded(formData.get("token"), 200);
  const decision = bounded(formData.get("decision"), 30);
  const responderName = bounded(formData.get("responderName"), 160);
  const responderTitle = bounded(formData.get("responderTitle"), 160);
  const responseNote = bounded(formData.get("responseNote"), 2000);
  if (!["accepted","declined","more_info"].includes(decision)) throw new Error("Invalid response.");

  const invitation = await invitationForToken(token);
  if (!invitation) throw new Error("Invitation not found.");
  const expired = new Date(String(invitation.expires_at)).getTime() < Date.now();
  if (expired && String(invitation.response_status) !== "accepted") throw new Error("This invitation has expired.");

  const sql = getDb();
  let industryPartnerId = String(invitation.industry_partner_id || "");
  if (decision === "accepted" && !industryPartnerId) {
    const existing = await sql`
      select id from industry_partners
      where lower(company_name)=lower(${String(invitation.company_name)})
        and status in ('pending','verified')
      order by created_at asc
      limit 1
    `;
    if (existing[0]?.id) {
      industryPartnerId = String(existing[0].id);
    } else {
      const created = await sql`
        insert into industry_partners (semantic_id, company_name, website, sector, status)
        values (
          ${"industry-" + randomUUID().slice(0,8)},
          ${String(invitation.company_name)},
          ${invitation.company_website ? String(invitation.company_website) : null},
          ${invitation.sector ? String(invitation.sector) : null},
          'pending'
        )
        returning id
      `;
      industryPartnerId = String(created[0]?.id || "");
    }
  }

  await sql`
    update vst_junior_company_invitations
    set response_status=${decision}, responder_name=${responderName || null},
        responder_title=${responderTitle || null}, response_note=${responseNote || null}, responded_at=now()
    where id=${String(invitation.invitation_id)}
  `;

  await sql`
    update industry_connection_requests
    set company_response_status=${decision},
        status=${decision === "declined" ? "closed" : "reviewing"},
        industry_partner_id=${industryPartnerId || null},
        updated_at=now()
    where id=${String(invitation.request_id)}
  `;

  revalidatePath("/company-invite/" + token);
  revalidatePath("/workspace/admin");
  revalidatePath("/workspace/partner/industry-connect");
}

export async function submitVstJuniorSimulation(formData: FormData) {
  const token = bounded(formData.get("token"), 200);
  const title = bounded(formData.get("title"), 180);
  const summary = bounded(formData.get("summary"), 3000);
  const instructions = bounded(formData.get("instructions"), 5000);
  const safetyNotes = bounded(formData.get("safetyNotes"), 2000);
  const targetGrades = allowedGrades(formData.getAll("targetGrades").map(String));
  const safeguardsConfirmed = formData.get("companySafeguards") === "yes";

  if (title.length < 4 || summary.length < 20 || instructions.length < 20) {
    throw new Error("Provide a clear title, summary and student instructions.");
  }
  if (!safeguardsConfirmed) throw new Error("Confirm the Grade 11-12 safeguarding and ViTech moderation requirement.");

  const invitation = await invitationForToken(token);
  if (!invitation || String(invitation.response_status) !== "accepted") {
    throw new Error("Accept the company connection before proposing a simulation.");
  }
  const requestedGrades = Array.isArray(invitation.target_grades) ? invitation.target_grades.map(String) : [];
  if (targetGrades.some((grade) => !requestedGrades.includes(grade))) {
    throw new Error("Simulation grades must stay within the Grade 11–12 cohort requested by the institution.");
  }

  const sql = getDb();
  await sql`
    insert into vst_junior_simulations (
      invitation_id, request_id, organization_id, industry_partner_id, company_name,
      title, summary, instructions, target_grades, safety_notes, company_safeguards_confirmed, status
    )
    values (
      ${String(invitation.invitation_id)}, ${String(invitation.request_id)}, ${String(invitation.organization_id)},
      ${invitation.industry_partner_id ? String(invitation.industry_partner_id) : null},
      ${String(invitation.company_name)}, ${title}, ${summary}, ${instructions},
      ${targetGrades}, ${safetyNotes || null}, true, 'submitted'
    )
  `;

  revalidatePath("/company-invite/" + token);
  revalidatePath("/workspace/admin");
}
