export type SafeSupportMetadata = {
  organizationId?: string;
  route: string;
  operation: string;
  errorCode?: string;
  provider?: string;
  latencyMs?: number;
  traceId?: string;
  containsStudentContent: false;
};

export function buildSafeSupportMetadata(input: Omit<SafeSupportMetadata, "containsStudentContent">): SafeSupportMetadata {
  return {
    ...input,
    containsStudentContent: false,
  };
}

export function langSmithTracingConfigured() {
  return process.env.LANGSMITH_TRACING === "true" && Boolean(process.env.LANGSMITH_API_KEY);
}

export const OBSERVABILITY_GUARDRAILS = [
  "Never trace learner names, emails, recordings, open responses, project content or guardian data.",
  "Never trace BYOK provider secrets or authorization headers.",
  "Use organization-scoped technical metadata, route/workflow name, latency, error code and trace ID.",
  "Tenant isolation is enforced in application authorization and database scope, not by observability tooling.",
  "Disable or self-host observability when required by the institution data policy.",
] as const;
