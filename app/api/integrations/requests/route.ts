import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getManagedOrganization } from "@/lib/integration-runtime";

export const dynamic = "force-dynamic";

const CAPABILITIES = new Set(["roster_sync","grade_passback","sso","content_launch","analytics_export","resource_sync","assessment_sync","career_content","simulation_launch"]);

export async function POST(request: Request) {
  let payload: { organizationId?: string; providerName?: string; providerUrl?: string; useCase?: string; requestedCapabilities?: unknown };
  try { payload = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getManagedOrganization(payload.organizationId ?? null);
  if (!access) return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });

  const providerName = typeof payload.providerName === "string" ? payload.providerName.trim().slice(0, 160) : "";
  const providerUrl = typeof payload.providerUrl === "string" ? payload.providerUrl.trim().slice(0, 500) : "";
  const useCase = typeof payload.useCase === "string" ? payload.useCase.trim().slice(0, 3000) : "";
  const requestedCapabilities = Array.isArray(payload.requestedCapabilities)
    ? payload.requestedCapabilities.map(String).filter((item) => CAPABILITIES.has(item)).slice(0, 12)
    : [];

  if (providerName.length < 2 || useCase.length < 10) {
    return NextResponse.json({ error: "Provider/app name and a short use case are required." }, { status: 400 });
  }
  if (providerUrl) {
    try {
      const url = new URL(providerUrl);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("bad protocol");
    } catch {
      return NextResponse.json({ error: "Provider URL must be a valid http(s) URL." }, { status: 400 });
    }
  }

  const sql = getDb();
  const rows = await sql`
    insert into integration_provider_requests (
      organization_id, requested_by, provider_name, provider_url, use_case, requested_capabilities, status
    )
    values (
      ${access.organization.id}, ${access.profile.id}, ${providerName}, ${providerUrl || null}, ${useCase}, ${requestedCapabilities}, 'pending'
    )
    returning id, status, created_at
  `;

  return NextResponse.json({
    ok: true,
    requestId: String(rows[0].id),
    status: String(rows[0].status),
    message: "Integration request received for ViTech review. Credentials must never be pasted into this request.",
  }, { status: 201 });
}
