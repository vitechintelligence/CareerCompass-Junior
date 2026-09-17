import { getDb } from "@/lib/db";

export type IntegrationCapability = "roster_sync" | "grade_passback" | "sso" | "content_launch" | "analytics_export";
export type IntegrationProtocol = "oauth2" | "lti_1_3" | "oneroster" | "scorm" | "xapi" | "webhook" | "api_key";

export type IntegrationProvider = {
  id: string;
  slug: string;
  displayName: string;
  category: string;
  protocol: IntegrationProtocol | string;
  descriptionEn: string | null;
  descriptionVi: string | null;
  capabilities: IntegrationCapability[];
  status: string;
};

export type CanonicalPerson = {
  externalId: string;
  role: "student" | "teacher" | "admin";
  displayName?: string;
  email?: string;
};

export type CanonicalClass = {
  externalId: string;
  name: string;
  academicCycle?: string;
  levelLabel?: string;
};

export type CanonicalEnrollment = {
  externalId: string;
  classExternalId: string;
  personExternalId: string;
  role: "student" | "teacher";
  status: "active" | "inactive";
};

export type CanonicalLearningEvent = {
  eventKey: string;
  eventType: "activity.completed" | "assignment.submitted" | "grade.updated" | "attendance.updated" | "progress.updated";
  actorExternalId: string;
  objectExternalId: string;
  occurredAt: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

export interface EducationIntegrationAdapter {
  provider: string;
  normalizePerson(payload: Record<string, unknown>): CanonicalPerson;
  normalizeClass(payload: Record<string, unknown>): CanonicalClass;
  normalizeEnrollment(payload: Record<string, unknown>): CanonicalEnrollment;
  normalizeLearningEvent(payload: Record<string, unknown>): CanonicalLearningEvent;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeRole(value: unknown): CanonicalPerson["role"] {
  const role = stringValue(value).toLowerCase();
  if (role.includes("teacher") || role.includes("instructor")) return "teacher";
  if (role.includes("admin")) return "admin";
  return "student";
}

/**
 * Generic adapter used by Custom REST, CSV/OneRoster importers and partner-owned modules.
 * Provider-specific adapters can extend this contract without changing the LMS data model.
 */
export const genericEducationAdapter: EducationIntegrationAdapter = {
  provider: "generic",
  normalizePerson(payload) {
    return {
      externalId: stringValue(payload.externalId ?? payload.id),
      role: normalizeRole(payload.role),
      displayName: stringValue(payload.displayName ?? payload.name) || undefined,
      email: stringValue(payload.email) || undefined,
    };
  },
  normalizeClass(payload) {
    return {
      externalId: stringValue(payload.externalId ?? payload.id),
      name: stringValue(payload.name ?? payload.title, "Imported class"),
      academicCycle: stringValue(payload.academicCycle ?? payload.term) || undefined,
      levelLabel: stringValue(payload.levelLabel ?? payload.grade) || undefined,
    };
  },
  normalizeEnrollment(payload) {
    return {
      externalId: stringValue(payload.externalId ?? payload.id),
      classExternalId: stringValue(payload.classExternalId ?? payload.classId),
      personExternalId: stringValue(payload.personExternalId ?? payload.userId),
      role: normalizeRole(payload.role) === "teacher" ? "teacher" : "student",
      status: stringValue(payload.status).toLowerCase() === "inactive" ? "inactive" : "active",
    };
  },
  normalizeLearningEvent(payload) {
    const rawType = stringValue(payload.eventType ?? payload.type, "progress.updated");
    const allowed = ["activity.completed", "assignment.submitted", "grade.updated", "attendance.updated", "progress.updated"];
    const eventType = (allowed.includes(rawType) ? rawType : "progress.updated") as CanonicalLearningEvent["eventType"];
    const score = typeof payload.score === "number" ? payload.score : undefined;
    return {
      eventKey: stringValue(payload.eventKey ?? payload.id, crypto.randomUUID()),
      eventType,
      actorExternalId: stringValue(payload.actorExternalId ?? payload.userId),
      objectExternalId: stringValue(payload.objectExternalId ?? payload.activityId ?? payload.assignmentId),
      occurredAt: stringValue(payload.occurredAt ?? payload.timestamp, new Date().toISOString()),
      score,
      metadata: typeof payload.metadata === "object" && payload.metadata ? payload.metadata as Record<string, unknown> : undefined,
    };
  },
};

export async function listIntegrationProviders(): Promise<IntegrationProvider[]> {
  const sql = getDb();
  const rows = await sql`
    select id, slug, display_name, category, protocol, description_en, description_vi, capabilities, status
    from integration_providers
    where status in ('available', 'beta')
    order by category, display_name
  `;
  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    displayName: String(row.display_name),
    category: String(row.category),
    protocol: String(row.protocol),
    descriptionEn: row.description_en ? String(row.description_en) : null,
    descriptionVi: row.description_vi ? String(row.description_vi) : null,
    capabilities: Array.isArray(row.capabilities) ? row.capabilities.map(String) as IntegrationCapability[] : [],
    status: String(row.status),
  }));
}

export async function listOrganizationIntegrations(organizationId: string) {
  const sql = getDb();
  return sql`
    select i.id, i.display_label, i.status, i.health_state, i.last_health_at, i.last_error,
           p.slug as provider_slug, p.display_name as provider_name, p.protocol, p.category
    from integration_installations i
    join integration_providers p on p.id = i.provider_id
    where i.organization_id = ${organizationId}
    order by p.display_name, i.display_label
  `;
}

export const integrationStandards = [
  { name: "LTI 1.3", purpose: "SSO, secure content launch and grade passback", examples: "Moodle, Canvas" },
  { name: "OneRoster", purpose: "Classes, teachers, students and enrollments", examples: "SIS / school databases" },
  { name: "SCORM", purpose: "Launch packaged learning modules", examples: "Existing courseware" },
  { name: "xAPI", purpose: "Export learning events to an LRS", examples: "Analytics / evidence systems" },
  { name: "REST + Webhooks", purpose: "Custom partner apps and event exchange", examples: "School portals, custom modules" },
  { name: "OAuth 2.0", purpose: "Authorized third-party APIs", examples: "Google Classroom, Microsoft Teams, Zoom" },
] as const;
