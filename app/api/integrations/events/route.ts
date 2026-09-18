import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getManagedOrganization } from "@/lib/integration-runtime";
import { validateCanonicalObject } from "@/lib/integration-adapter-core";
import { getEducationAdapter } from "@/lib/provider-adapters";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let payload: { organizationId?: string; installationId?: string; event?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getManagedOrganization(payload.organizationId ?? null);
  if (!access) {
    return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });
  }

  const installationId = typeof payload.installationId === "string" ? payload.installationId : "";
  if (!UUID_RE.test(installationId)) {
    return NextResponse.json({ error: "A valid installationId is required." }, { status: 400 });
  }
  if (!payload.event || typeof payload.event !== "object" || Array.isArray(payload.event)) {
    return NextResponse.json({ error: "A learning event payload is required." }, { status: 400 });
  }

  const sql = getDb();
  const installations = await sql`
    select i.id, p.slug as provider_slug
    from integration_installations i
    join integration_providers p on p.id=i.provider_id
    where i.id=${installationId} and i.organization_id=${access.organization.id}
      and i.status in ('pending','active','configured')
      and p.status in ('available','beta')
    limit 1
  `;
  const installation = installations[0];
  if (!installation) {
    return NextResponse.json({ error: "Installation not found for this organization." }, { status: 404 });
  }

  const providerSlug = String(installation.provider_slug);
  const adapter = getEducationAdapter(providerSlug);
  const event = adapter.normalizeLearningEvent(payload.event as Record<string, unknown>);
  const validation = validateCanonicalObject("event", event);
  if (!validation.ok) {
    return NextResponse.json({
      error: "Adapter produced an invalid learning event.",
      provider: adapter.provider,
      validation,
    }, { status: 422 });
  }

  const eventJson = JSON.stringify(event);
  const rows = await sql`
    insert into integration_events (
      installation_id, direction, event_type, event_key, payload, signature_valid, processed_status
    ) values (
      ${installationId}, 'inbound', ${event.eventType}, ${event.eventKey}, ${eventJson}::jsonb,
      null, 'received'
    )
    on conflict (installation_id, event_key) do nothing
    returning id, received_at, processed_status
  `;

  if (!rows[0]) {
    const existing = await sql`
      select id, received_at, processed_status
      from integration_events
      where installation_id=${installationId} and event_key=${event.eventKey}
      limit 1
    `;
    if (!existing[0]) {
      return NextResponse.json({ error: "Unable to resolve duplicate event." }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      duplicate: true,
      provider: adapter.provider,
      eventId: String(existing[0].id),
      eventKey: event.eventKey,
      status: String(existing[0].processed_status),
      receivedAt: existing[0].received_at,
    }, { status: 200 });
  }

  const detail = JSON.stringify({
    provider: adapter.provider,
    eventType: event.eventType,
    eventKey: event.eventKey,
    signatureVerification: "not-applicable-authenticated-admin-ingest",
  });
  await sql`
    insert into integration_audit_log (
      organization_id, installation_id, actor_profile_id, action, detail
    ) values (
      ${access.organization.id}, ${installationId}, ${access.profile.id},
      'integration.event.received', ${detail}::jsonb
    )
  `;

  return NextResponse.json({
    ok: true,
    duplicate: false,
    provider: adapter.provider,
    eventId: String(rows[0].id),
    eventKey: event.eventKey,
    status: String(rows[0].processed_status),
    receivedAt: rows[0].received_at,
  }, { status: 202 });
}
