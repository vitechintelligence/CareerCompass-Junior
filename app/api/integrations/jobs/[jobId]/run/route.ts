import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getManagedOrganization } from "@/lib/integration-runtime";
import { executeIntegrationJob } from "@/lib/integration-job-executor";
import { readBoundedJson } from "@/lib/learning/request-json";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  if (!isRiskyFeatureEnabled("integrationJobExecution")) {
    return NextResponse.json(
      { error: "integration_job_execution_disabled" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { jobId } = await params;
  if (!UUID_RE.test(jobId)) {
    return NextResponse.json({ error: "Invalid job reference." }, { status: 400 });
  }

  let organizationId: string | null = null;
  try {
    const body = await readBoundedJson(request, 8 * 1024);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const raw = (body as Record<string, unknown>).organizationId;
      organizationId = typeof raw === "string" ? raw : null;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getManagedOrganization(organizationId);
  if (!access) {
    return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });
  }

  const result = await executeIntegrationJob({
    jobId,
    organizationId: access.organization.id,
    workerKey: `manual:${access.profile.id}:${randomUUID()}`,
  });

  return NextResponse.json(result, {
    status: result.status === "not_runnable" ? 409 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
