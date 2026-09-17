import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getManagedOrganization, normalizeInboundLearningEvent } from "@/lib/integration-runtime";

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
  if (!access) return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });

  const installationId = typeof payload.installationId === "string" ? payload.installationId : "";
  if (!UUID_RE.test(installationId)) return NextResponse.json({ error: "A valid installationId is required." }, { status: 400 });
  if (!payload.event || typeof payload.event !== "object" || Array.isArray(payload.event)) {
    return NextResponse.json({ error: "A canonical learning event payload is required." }, { status: 400 });
  }

  const sql = getDb();
  const installations = await sql`
    select id from integration_installations
    where id=${installationId} and organization_id=${access.organization.id}
      and status in ('pending','active','configured')
    limit 1
  `;
  if (!installations[0]) return NextResponse.json({ error: "Installation not found for this organization." }, { status: 404 });

  const event = normalizeInboundLearningEvent(payload.event as Record<string, unknown>);
  if (!event.actorExternalId || !event.objectExternalId) {
    return NextResponse.json({ error: "Event actor and object identifiers are required." }, { status: 400 });
  }

  const eventJson = JSON.stringify(event);
  const rows = await sql`
    insert into integration_events (
      installation_id, direction, event_type, event_key, payload, signature_valid, processed_status
    ) values (
      ${installationId}, 'inbound', ${event.eventType}, ${event.eventKey}, ${eventJson}::jsonb,
      true, 'received'
    )
    returning id, received_at, processed_status
  `;

  return NextResponse.json({
    ok: true,
    eventId: String(rows[0].id),
    eventKey: event.eventKey,
    status: String(rows[0].processed_status),
    receivedAt: rows[0].received_at,
  }, { status: 202 });
}
