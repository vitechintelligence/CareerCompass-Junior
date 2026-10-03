import { getDb } from "@/lib/db";

import { LEARNING_WRITE_LIMITS, quotaScopeKeys } from "@/lib/learning/write-quota-policy";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";

export class LearningWriteQuotaError extends Error {
  readonly status = 429;
  constructor(public readonly code = "learning_write_quota_exceeded") {
    super(code);
  }
}

export async function enforceLearningWriteQuota(input: {
  profileId: string;
  organizationId?: string | null;
  submissionId?: string | null;
  resource: "activity" | "assessment" | "steam";
}) {
  if (!isRiskyFeatureEnabled("learningWriteQuotas")) {
    return { duplicate: false, allowed: true, featureEnabled: false };
  }

  const sql = getDb();

  if (input.submissionId) {
    const existing = input.resource === "activity"
      ? await sql`select 1 from activity_attempts where submission_id=${input.submissionId}::uuid limit 1`
      : input.resource === "assessment"
        ? await sql`select 1 from assessment_attempts where submission_id=${input.submissionId}::uuid limit 1`
        : await sql`select 1 from steam_attempts where submission_id=${input.submissionId}::uuid limit 1`;
    if (existing[0]) return { duplicate: true, allowed: true };
  }

  const scopes = quotaScopeKeys(input.profileId, input.organizationId);
  const windows: Array<{ scopeKey: string; kind: "minute" | "day"; limit: number }> = [
    { scopeKey: scopes.learner, kind: "minute", limit: LEARNING_WRITE_LIMITS.learnerMinute },
    { scopeKey: scopes.learner, kind: "day", limit: LEARNING_WRITE_LIMITS.learnerDay },
  ];
  if (scopes.organization) {
    windows.push(
      { scopeKey: scopes.organization, kind: "minute", limit: LEARNING_WRITE_LIMITS.organizationMinute },
      { scopeKey: scopes.organization, kind: "day", limit: LEARNING_WRITE_LIMITS.organizationDay },
    );
  }

  for (const window of windows) {
    const rows = await sql`
      insert into learning_write_quota_windows (
        scope_key, window_kind, window_start, write_count, updated_at
      )
      values (
        ${window.scopeKey},
        ${window.kind},
        date_trunc(${window.kind}, now()),
        1,
        now()
      )
      on conflict (scope_key, window_kind, window_start) do update set
        write_count=learning_write_quota_windows.write_count + 1,
        updated_at=now()
      where learning_write_quota_windows.write_count < ${window.limit}
      returning write_count
    `;
    if (!rows[0]) throw new LearningWriteQuotaError();
  }

  return { duplicate: false, allowed: true };
}
