import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getManagedOrganization } from "@/lib/integration-runtime";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JOB_TYPES = new Set(["roster_sync", "grade_passback", "analytics_export", "health_check"]);
const DIRECTIONS = new Set(["inbound", "outbound"]);

export async function POST(request: Request) {
  let payload: { organizationId?: string; installationId?: string; jobType?: string; direction?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getManagedOrganization(payload.organizationId ?? null);
  if (!access) return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });

  const installationId = typeof payload.installationId === "string" ? payload.installationId : "";
  const jobType = typeof payload.jobType === "string" ? payload.jobType : "";
  const direction = typeof payload.direction === "string" ? payload.direction : "inbound";
  if (!UUID_RE.test(installationId) || !JOB_TYPES.has(jobType) || !DIRECTIONS.has(direction)) {
    return NextResponse.json({ error: "Valid installationId, jobType and direction are required." }, { status: 400 });
  }

  const sql = getDb();
  const installation = await sql`
    select i.id, p.capabilities
    from integration_installations i
    join integration_providers p on p.id=i.provider_id
    where i.id=${installationId} and i.organization_id=${access.organization.id}
      and i.status in ('pending','active','configured')
    limit 1
  `;
  if (!installation[0]) return NextResponse.json({ error: "Installation not found for this organization." }, { status: 404 });

  if (jobType !== "health_check") {
    const capabilities = Array.isArray(installation[0].capabilities) ? installation[0].capabilities.map(String) : [];
    if (!capabilities.includes(jobType)) {
      return NextResponse.json({ error: `Provider does not support ${jobType}.` }, { status: 409 });
    }
  }

  const rows = await sql`
    insert into integration_sync_jobs (
      installation_id, job_type, direction, status, scheduled_at, triggered_by
    ) values (
      ${installationId}, ${jobType}, ${direction}, 'queued', now(), ${access.profile.id}
    )
    returning id, status, scheduled_at
  `;

  return NextResponse.json({
    ok: true,
    jobId: String(rows[0].id),
    status: String(rows[0].status),
    scheduledAt: rows[0].scheduled_at,
    message: "Sync job queued for the provider worker/runtime.",
  }, { status: 202 });
}
