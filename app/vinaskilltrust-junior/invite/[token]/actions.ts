"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  parseJuniorAdminMeta,
  parseJuniorRequestPayload,
  stringifyJuniorAdminMeta,
  verifyJuniorInviteToken,
} from "@/lib/vinaskilltrust-junior";

function bounded(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

async function requestForToken(token: string) {
  const verified = verifyJuniorInviteToken(token);
  if (!verified) throw new Error("This invitation is invalid or has expired.");

  const sql = getDb();
  const rows = await sql`
    select r.id, r.organization_id, r.company_name, r.note, r.admin_note, r.status
    from industry_connection_requests r
    where r.id=${verified.requestId}
    limit 1
  `;
  const row = rows[0];
  const payload = parseJuniorRequestPayload(row?.note);
  if (!row || !payload || payload.companyEmail.toLowerCase() !== verified.companyEmail) {
    throw new Error("This invitation is no longer valid.");
  }
  return { sql, row, payload };
}

export async function respondToJuniorInvitation(formData: FormData) {
  const token = bounded(formData.get("token"), 3000);
  const response = bounded(formData.get("response"), 40);
  const note = bounded(formData.get("responseNote"), 2000);
  if (!["accepted", "declined", "info_requested"].includes(response)) throw new Error("Invalid response.");

  const { sql, row } = await requestForToken(token);
  const meta = parseJuniorAdminMeta(row.admin_note);

  if (response === "accepted") {
    const safeguardsAccepted =
      formData.get("ageAppropriate") === "yes" &&
      formData.get("noStudentData") === "yes" &&
      formData.get("noOffPlatformContact") === "yes" &&
      formData.get("moderation") === "yes";
    if (!safeguardsAccepted) {
      throw new Error("Accept the Grade 11–12 safeguarding and ViTech moderation requirements before joining.");
    }
    meta.companyResponse = {
      status: "accepted",
      note,
      respondedAt: new Date().toISOString(),
      safeguardsAccepted: true,
    };
  } else {
    meta.companyResponse = {
      status: response as "declined" | "info_requested",
      note,
      respondedAt: new Date().toISOString(),
    };
  }

  const requestStatus = response === "declined" ? "closed" : "reviewing";
  await sql`
    update industry_connection_requests
    set status=${requestStatus}, admin_note=${stringifyJuniorAdminMeta(meta)}, updated_at=now()
    where id=${String(row.id)}
  `;

  revalidatePath(`/vinaskilltrust-junior/invite/${token}`);
  revalidatePath("/workspace/admin");
}

export async function submitJuniorSimulationProposal(formData: FormData) {
  const token = bounded(formData.get("token"), 3000);
  const title = bounded(formData.get("title"), 180);
  const overview = bounded(formData.get("overview"), 3000);
  const learningObjectives = bounded(formData.get("learningObjectives"), 3000);
  const tasks = bounded(formData.get("tasks"), 5000);
  const safetyNotes = bounded(formData.get("safetyNotes"), 2500);
  const estimatedMinutes = Math.min(240, Math.max(15, Number(formData.get("estimatedMinutes") || 60)));

  if (title.length < 3 || overview.length < 20 || learningObjectives.length < 10 || tasks.length < 20) {
    throw new Error("Complete the simulation title, overview, learning objectives and learner tasks.");
  }

  const { sql, row, payload } = await requestForToken(token);
  const meta = parseJuniorAdminMeta(row.admin_note);
  if (meta.companyResponse?.status !== "accepted" || !meta.companyResponse.safeguardsAccepted) {
    throw new Error("Accept the invitation and safeguarding requirements before submitting a simulation.");
  }

  meta.simulation = {
    title,
    overview,
    learningObjectives,
    tasks,
    estimatedMinutes,
    safetyNotes,
    allowedGrades: payload.grades.filter((grade) => grade === "11" || grade === "12"),
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };

  await sql`
    update industry_connection_requests
    set status='reviewing', admin_note=${stringifyJuniorAdminMeta(meta)}, updated_at=now()
    where id=${String(row.id)}
  `;

  revalidatePath(`/vinaskilltrust-junior/invite/${token}`);
  revalidatePath("/workspace/admin");
}
