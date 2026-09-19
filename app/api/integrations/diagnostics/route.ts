import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getManagedOrganization } from "@/lib/integration-runtime";
import { runAdapterDiagnostic } from "@/lib/integration-diagnostics";

export const dynamic = "force-dynamic";

const PROVIDER_RE = /^[a-z0-9-]{2,80}$/;

export async function POST(request: Request) {
  let payload: { organizationId?: string; providerSlug?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getManagedOrganization(payload.organizationId ?? null);
  if (!access) {
    return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });
  }

  const providerSlug = typeof payload.providerSlug === "string"
    ? payload.providerSlug.trim().toLowerCase()
    : "";
  if (!PROVIDER_RE.test(providerSlug)) {
    return NextResponse.json({ error: "A valid providerSlug is required." }, { status: 400 });
  }

  const sql = getDb();
  const providers = await sql`
    select slug, display_name, protocol, status
    from integration_providers
    where slug=${providerSlug} and status in ('available','beta')
    limit 1
  `;
  const provider = providers[0];
  if (!provider) {
    return NextResponse.json({ error: "Integration provider is not available." }, { status: 404 });
  }

  const diagnostic = runAdapterDiagnostic(providerSlug);

  return NextResponse.json({
    ...diagnostic,
    providerName: String(provider.display_name),
    protocol: String(provider.protocol),
    note: diagnostic.ok
      ? "Adapter normalization and secret-scrubbing checks passed. External provider authorization is tested separately when credentials are configured."
      : "Adapter diagnostics failed. Do not activate this connector until the reported checks pass.",
  }, { status: diagnostic.ok ? 200 : 422 });
}
