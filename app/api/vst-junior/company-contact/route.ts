import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getManagedOrganization } from "@/lib/integration-runtime";
import { getOrganizationRuntimePolicy, serverAiPermission } from "@/lib/organization-data-policy";
import { platformAiRuntime } from "@/lib/platform-ai-runtime";
import { findPublicCompanyContact } from "@/lib/vst-junior-ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { organizationId?: unknown; companyName?: unknown; website?: unknown };
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const access = await getManagedOrganization(organizationId);
  if (!access) {
    return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });
  }

  const sql = getDb();
  const feature = await sql`
    select 1 from organization_features
    where organization_id=${access.organization.id}
      and feature_key='industry_connector'
      and enabled=true
    limit 1
  `;
  if (!feature[0]) {
    return NextResponse.json({ error: "Industry connector is not enabled for this institution." }, { status: 403 });
  }

  const policy = await getOrganizationRuntimePolicy(access.organization.id);
  const platformRuntime = platformAiRuntime();
  const aiPermission = serverAiPermission(policy, {
    platformAdmin: access.profile.account_type === "platform_admin",
    platformMode: platformRuntime.mode,
  });
  if (!aiPermission.allowed) {
    return NextResponse.json({ error: aiPermission.reason, code: aiPermission.code }, { status: 409 });
  }

  
  const companyName = String(body.companyName || "").trim().slice(0, 180);
  const website = String(body.website || "").trim().slice(0, 500);
  if (companyName.length < 2) {
    return NextResponse.json({ error: "Enter a company name first." }, { status: 400 });
  }

  const allowWebSearch = access.profile.account_type === "platform_admin"
    && platformRuntime.mode === "openai"
    && process.env.CCJ_PLATFORM_OPENAI_WEB_SEARCH_ENABLED === "true";
  const result = await findPublicCompanyContact(companyName, website, {
    mode: access.profile.account_type === "platform_admin" ? platformRuntime.mode : "mock",
    model: platformRuntime.model,
    allowWebSearch,
  });
  return NextResponse.json({ ...result, testMode: !allowWebSearch });
}
