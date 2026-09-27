import "server-only";

import { getDb } from "@/lib/db";

export type OrganizationRuntimePolicy = {
  evidenceStorageMode: "platform_metadata" | "school_capsule" | "vng_cloud" | "local_browser" | "manual";
  aiMode: "off" | "byok" | "local_browser";
  aiProvider: string | null;
  byokConfigured: boolean;
  observabilityMode: "metadata_only" | "disabled" | "self_hosted";
  rawStudentContentTracing: false;
};

export async function getOrganizationRuntimePolicy(organizationId: string): Promise<OrganizationRuntimePolicy> {
  const sql = getDb();
  const rows = await sql`
    select evidence_storage_mode, ai_mode, ai_provider, byok_configured,
           observability_mode, raw_student_content_tracing
    from organization_data_policies
    where organization_id=${organizationId}
    limit 1
  `;
  const row = rows[0];
  return {
    evidenceStorageMode: (String(row?.evidence_storage_mode || "platform_metadata") as OrganizationRuntimePolicy["evidenceStorageMode"]),
    aiMode: (String(row?.ai_mode || "off") as OrganizationRuntimePolicy["aiMode"]),
    aiProvider: row?.ai_provider ? String(row.ai_provider) : null,
    byokConfigured: Boolean(row?.byok_configured),
    observabilityMode: (String(row?.observability_mode || "metadata_only") as OrganizationRuntimePolicy["observabilityMode"]),
    rawStudentContentTracing: false,
  };
}

export function serverAiPermission(
  policy: OrganizationRuntimePolicy,
  context?: { platformAdmin?: boolean; platformMode?: "openai" | "mock" },
) {
  if (context?.platformAdmin) {
    return {
      allowed: true as const,
      provider: context.platformMode === "openai" ? "openai-platform-test" : "mock-platform-test",
      reason: context.platformMode === "openai" ? "platform_admin_openai_test" : "platform_admin_mock_test",
    };
  }
  if (policy.aiMode === "off") {
    return { allowed: false as const, code: "organization_ai_disabled", reason: "Live AI is disabled by this institution." };
  }
  if (policy.aiMode === "local_browser") {
    return { allowed: false as const, code: "local_ai_only", reason: "This institution allows local-browser AI only; server AI calls are disabled." };
  }
  if (!policy.byokConfigured) {
    return { allowed: false as const, code: "byok_not_configured", reason: "BYOK is selected but no institution-controlled provider credential is configured." };
  }
  return { allowed: false as const, code: "byok_runtime_not_connected", reason: "BYOK is configured in policy metadata, but the tenant credential runtime is not connected to this feature yet." };
}
