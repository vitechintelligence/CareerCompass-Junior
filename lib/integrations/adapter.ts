export type IntegrationCapability =
  | "roster_sync"
  | "grade_passback"
  | "sso"
  | "content_launch"
  | "analytics_export";

export type IntegrationContext = {
  organizationId: string;
  installationId: string;
};

export type ExternalUser = {
  externalId: string;
  email?: string;
  displayName?: string;
  role?: "student" | "teacher" | "admin";
};

export type ExternalCourse = {
  externalId: string;
  name: string;
  code?: string;
};

export type ExternalEnrollment = {
  externalId: string;
  courseExternalId: string;
  userExternalId: string;
  role: "student" | "teacher";
};

export type ProgressEvent = {
  userExternalId: string;
  courseExternalId?: string;
  activityExternalId?: string;
  status: "started" | "in_progress" | "completed";
  score?: number;
  occurredAt: string;
};

export interface IntegrationAdapter {
  readonly providerSlug: string;
  readonly capabilities: IntegrationCapability[];
  testConnection(context: IntegrationContext): Promise<{ ok: boolean; message?: string }>;
  pullRoster?(context: IntegrationContext): Promise<{
    users: ExternalUser[];
    courses: ExternalCourse[];
    enrollments: ExternalEnrollment[];
  }>;
  pushProgress?(context: IntegrationContext, events: ProgressEvent[]): Promise<{ accepted: number }>;
  getLaunchUrl?(context: IntegrationContext, resourceId: string): Promise<string>;
  handleWebhook?(context: IntegrationContext, request: Request): Promise<{ accepted: boolean }>;
}

export class AdapterNotConfiguredError extends Error {
  constructor(providerSlug: string) {
    super(`Integration adapter '${providerSlug}' is registered in Neon but does not yet have runtime credentials/configuration.`);
    this.name = "AdapterNotConfiguredError";
  }
}
