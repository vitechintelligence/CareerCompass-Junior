import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getManagedOrganization, safeConfig } from "@/lib/integration-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const access = await getManagedOrganization(url.searchParams.get("organizationId"));
  if (!access) return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });

  const sql = getDb();
  const rows = await sql`
    select i.id, i.display_label, i.config, i.scopes, i.status, i.health_state,
           i.last_health_at, i.last_error, i.created_at, i.updated_at,
           p.slug as provider_slug, p.display_name as provider_name, p.category, p.protocol, p.capabilities
    from integration_installations i
    join integration_providers p on p.id=i.provider_id
    where i.organization_id=${access.organization.id}
    order by i.created_at desc
  `;
  return NextResponse.json({ organization: access.organization, installations: rows });
}

export async function POST(request: Request) {
  let payload: { organizationId?: string; providerSlug?: string; displayLabel?: string; config?: unknown; scopes?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getManagedOrganization(payload.organizationId ?? null);
  if (!access) return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });

  const providerSlug = typeof payload.providerSlug === "string" ? payload.providerSlug.trim() : "";
  if (!/^[a-z0-9-]{2,80}$/.test(providerSlug)) {
    return NextResponse.json({ error: "A valid provider slug is required." }, { status: 400 });
  }

  const sql = getDb();
  const providers = await sql`
    select id, display_name, capabilities, status
    from integration_providers
    where slug=${providerSlug} and status in ('available','beta')
    limit 1
  `;
  const provider = providers[0];
  if (!provider) return NextResponse.json({ error: "Integration provider is not available." }, { status: 404 });

  const existing = await sql`
    select id, status from integration_installations
    where organization_id=${access.organization.id} and provider_id=${String(provider.id)}
      and status <> 'disabled'
    order by created_at desc limit 1
  `;
  if (existing[0]) {
    return NextResponse.json({ ok: true, existing: true, installationId: String(existing[0].id), status: String(existing[0].status) });
  }

  const capabilities = Array.isArray(provider.capabilities) ? provider.capabilities.map(String) : [];
  const requestedScopes = Array.isArray(payload.scopes) ? payload.scopes.map(String) : [];
  const scopes = requestedScopes.filter((scope) => capabilities.includes(scope));
  const config = JSON.stringify(safeConfig(payload.config));
  const displayLabel = typeof payload.displayLabel === "string" && payload.displayLabel.trim()
    ? payload.displayLabel.trim().slice(0, 120)
    : String(provider.display_name);

  const rows = await sql`
    insert into integration_installations (
      provider_id, organization_id, installed_by, display_label, config, scopes, status, health_state
    ) values (
      ${String(provider.id)}, ${access.organization.id}, ${access.profile.id}, ${displayLabel},
      ${config}::jsonb, ${scopes}, 'pending', 'unknown'
    )
    returning id, status, health_state
  `;

  return NextResponse.json({
    ok: true,
    existing: false,
    installationId: String(rows[0].id),
    status: String(rows[0].status),
    healthState: String(rows[0].health_state),
    message: "Integration slot created. Credentials remain server-side and must be configured through the provider-specific setup flow.",
  }, { status: 201 });
}
