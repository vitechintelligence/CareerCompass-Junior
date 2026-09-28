import { getDb } from "@/lib/db";
import { runAdapterDiagnostic } from "@/lib/integration-diagnostics";
import { getConnectorReadiness } from "@/lib/integration-readiness";
import { integrationFailureState } from "@/lib/integration-job-policy";

export type IntegrationExecutionResult = {
  jobId: string;
  status: "completed" | "retry" | "dead_letter" | "not_runnable";
  message: string;
  attemptCount?: number;
};

export async function executeIntegrationJob(input: {
  jobId: string;
  organizationId: string;
  workerKey: string;
}): Promise<IntegrationExecutionResult> {
  const sql = getDb();

  const claimed = await sql`
    update integration_sync_jobs j
    set
      status='running',
      attempt_count=j.attempt_count + 1,
      started_at=coalesce(j.started_at, now()),
      locked_at=now(),
      worker_key=${input.workerKey},
      next_attempt_at=null
    from integration_installations i
    where j.id=${input.jobId}
      and i.id=j.installation_id
      and i.organization_id=${input.organizationId}
      and j.status in ('queued','retry')
      and coalesce(j.next_attempt_at, j.scheduled_at) <= now()
      and (j.locked_at is null or j.locked_at < now() - interval '10 minutes')
    returning j.id, j.installation_id, j.job_type, j.direction,
      j.attempt_count, j.max_attempts
  `;

  const job = claimed[0];
  if (!job) {
    return { jobId: input.jobId, status: "not_runnable", message: "Job is already running, finished, or not due." };
  }

  const installRows = await sql`
    select
      i.id, i.status, i.config, i.scopes,
      p.slug as provider_slug, p.display_name as provider_name, p.capabilities
    from integration_installations i
    join integration_providers p on p.id=i.provider_id
    where i.id=${String(job.installation_id)}
      and i.organization_id=${input.organizationId}
    limit 1
  `;
  const installation = installRows[0];
  if (!installation) {
    return failJob({
      jobId: input.jobId,
      organizationId: input.organizationId,
      attemptCount: Number(job.attempt_count),
      maxAttempts: Number(job.max_attempts),
      code: "installation_not_found",
      message: "Installation disappeared before execution.",
    });
  }

  const providerSlug = String(installation.provider_slug || "");
  try {
    if (String(job.job_type) === "health_check") {
      const diagnostic = runAdapterDiagnostic(providerSlug);
      const health = diagnostic.ok ? "healthy" : "degraded";
      await sql.transaction((txn) => [
        txn`
          update integration_installations
          set
            health_state=${health},
            last_health_at=now(),
            last_error=${diagnostic.ok ? null : "adapter_diagnostic_failed"},
            updated_at=now()
          where id=${String(job.installation_id)}
            and organization_id=${input.organizationId}
        `,
        txn`
          update integration_sync_jobs
          set
            status='completed',
            finished_at=now(),
            locked_at=null,
            worker_key=null,
            records_total=1,
            records_ok=${diagnostic.ok ? 1 : 0},
            records_failed=${diagnostic.ok ? 0 : 1},
            result_detail=${JSON.stringify({
              provider: providerSlug,
              adapterMode: diagnostic.adapterMode,
              checks: diagnostic.checks,
            })}::jsonb,
            error_detail=null
          where id=${input.jobId}
        `,
        txn`
          insert into integration_reconciliation_items (
            sync_job_id, external_type, external_id, canonical_type, canonical_id, status, detail
          )
          values (
            ${input.jobId}, 'installation', ${String(job.installation_id)},
            'integration_installation', ${String(job.installation_id)},
            ${diagnostic.ok ? "matched" : "failed"},
            ${JSON.stringify({ provider: providerSlug, adapterMode: diagnostic.adapterMode })}::jsonb
          )
        `,
        txn`
          insert into integration_job_events (sync_job_id, event_type, detail)
          values (
            ${input.jobId}, 'completed',
            ${JSON.stringify({ provider: providerSlug, health })}::jsonb
          )
        `,
      ]);
      return {
        jobId: input.jobId,
        status: "completed",
        message: diagnostic.ok
          ? "Adapter health check executed and reconciled."
          : "Adapter health check executed with degraded diagnostics.",
        attemptCount: Number(job.attempt_count),
      };
    }

    const readiness = getConnectorReadiness(providerSlug);
    throw new Error(
      readiness.stage === "live_verified"
        ? "provider_transport_not_implemented"
        : "provider_transport_not_live_verified",
    );
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 160) : "integration_job_failed";
    return failJob({
      jobId: input.jobId,
      organizationId: input.organizationId,
      attemptCount: Number(job.attempt_count),
      maxAttempts: Number(job.max_attempts),
      code,
      message: "Provider execution did not complete.",
    });
  }
}

async function failJob(input: {
  jobId: string;
  organizationId: string;
  attemptCount: number;
  maxAttempts: number;
  code: string;
  message: string;
}): Promise<IntegrationExecutionResult> {
  const sql = getDb();
  const failure = integrationFailureState(input.attemptCount, input.maxAttempts);
  const retrySeconds = failure.retryAfterSeconds;

  await sql.transaction((txn) => [
    txn`
      update integration_sync_jobs j
      set
        status=${failure.status},
        locked_at=null,
        worker_key=null,
        next_attempt_at=${retrySeconds == null ? null : new Date(Date.now() + retrySeconds * 1000).toISOString()}::timestamptz,
        finished_at=${failure.status === "dead_letter" ? new Date().toISOString() : null}::timestamptz,
        error_detail=${JSON.stringify({ code: input.code, attemptCount: input.attemptCount })}::jsonb
      from integration_installations i
      where j.id=${input.jobId}
        and i.id=j.installation_id
        and i.organization_id=${input.organizationId}
    `,
    txn`
      insert into integration_job_events (sync_job_id, event_type, detail)
      values (
        ${input.jobId}, ${failure.status},
        ${JSON.stringify({
          code: input.code,
          attemptCount: input.attemptCount,
          retryAfterSeconds: retrySeconds,
        })}::jsonb
      )
    `,
  ]);

  return {
    jobId: input.jobId,
    status: failure.status,
    message: input.message,
    attemptCount: input.attemptCount,
  };
}
