export type IntegrationCapability =
  | "roster_sync"
  | "grade_passback"
  | "sso"
  | "content_launch"
  | "analytics_export"
  | "resource_sync"
  | "assessment_sync"
  | "career_content"
  | "simulation_launch";

export type IntegrationProtocol =
  | "oauth2"
  | "lti_1_3"
  | "oneroster"
  | "scorm"
  | "xapi"
  | "webhook"
  | "api_key";

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
  eventType:
    | "activity.completed"
    | "assignment.submitted"
    | "grade.updated"
    | "attendance.updated"
    | "progress.updated";
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

export type CanonicalObjectType = "person" | "class" | "enrollment" | "event";

export type AdapterValidationResult = {
  ok: boolean;
  errors: string[];
};

const EVENT_TYPES = new Set<CanonicalLearningEvent["eventType"]>([
  "activity.completed",
  "assignment.submitted",
  "grade.updated",
  "attendance.updated",
  "progress.updated",
]);

function boundedText(value: unknown, fallback = "", max = 300) {
  if (typeof value !== "string") return fallback;
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export function normalizeRole(value: unknown): CanonicalPerson["role"] {
  const role = boundedText(value).toLowerCase();
  if (role.includes("teacher") || role.includes("instructor") || role.includes("faculty")) return "teacher";
  if (role.includes("admin") || role.includes("administrator")) return "admin";
  return "student";
}

function normalizeEnrollmentRole(value: unknown): CanonicalEnrollment["role"] {
  return normalizeRole(value) === "teacher" ? "teacher" : "student";
}

function validIsoDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function normalizedScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(value, 1000000));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function blockedSecretKey(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    normalized.includes("password") ||
    normalized.includes("secret") ||
    normalized.includes("apikey") ||
    normalized.includes("privatekey") ||
    normalized.includes("accesstoken") ||
    normalized.includes("refreshtoken") ||
    normalized.includes("credential") ||
    normalized.includes("ciphertext")
  );
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 5) return undefined;
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return boundedText(value, "", 2000);
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeValue(item, depth + 1)).filter((item) => item !== undefined);
  }
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value).slice(0, 100);
  const clean: Record<string, unknown> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = boundedText(rawKey, "", 120);
    if (!key || blockedSecretKey(key)) continue;
    const sanitized = sanitizeValue(rawValue, depth + 1);
    if (sanitized !== undefined) clean[key] = sanitized;
  }
  return clean;
}

export function safeIntegrationConfig(input: unknown): Record<string, unknown> {
  const sanitized = sanitizeValue(input, 0);
  return isRecord(sanitized) ? sanitized : {};
}

export function safeIntegrationMetadata(input: unknown): Record<string, unknown> | undefined {
  const sanitized = sanitizeValue(input, 0);
  return isRecord(sanitized) && Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function deterministicEventKey(
  eventType: CanonicalLearningEvent["eventType"],
  actorExternalId: string,
  objectExternalId: string,
  occurredAt: string,
) {
  return boundedText(`${eventType}:${actorExternalId}:${objectExternalId}:${occurredAt}`, "", 240);
}

/**
 * Generic adapter for custom REST, CSV importers and partner-owned modules.
 * It converts external objects into the stable canonical contract consumed by the LMS.
 */
export const genericEducationAdapter: EducationIntegrationAdapter = {
  provider: "generic",
  normalizePerson(payload) {
    return {
      externalId: boundedText(payload.externalId ?? payload.id, "", 200),
      role: normalizeRole(payload.role),
      displayName: boundedText(payload.displayName ?? payload.name, "", 200) || undefined,
      email: boundedText(payload.email, "", 320) || undefined,
    };
  },
  normalizeClass(payload) {
    return {
      externalId: boundedText(payload.externalId ?? payload.id, "", 200),
      name: boundedText(payload.name ?? payload.title, "Imported class", 200),
      academicCycle: boundedText(payload.academicCycle ?? payload.term, "", 120) || undefined,
      levelLabel: boundedText(payload.levelLabel ?? payload.grade, "", 120) || undefined,
    };
  },
  normalizeEnrollment(payload) {
    return {
      externalId: boundedText(payload.externalId ?? payload.id, "", 200),
      classExternalId: boundedText(payload.classExternalId ?? payload.classId, "", 200),
      personExternalId: boundedText(payload.personExternalId ?? payload.userId, "", 200),
      role: normalizeEnrollmentRole(payload.role),
      status: boundedText(payload.status).toLowerCase() === "inactive" ? "inactive" : "active",
    };
  },
  normalizeLearningEvent(payload) {
    const requestedType = boundedText(payload.eventType ?? payload.type, "progress.updated", 80);
    const eventType = EVENT_TYPES.has(requestedType as CanonicalLearningEvent["eventType"])
      ? (requestedType as CanonicalLearningEvent["eventType"])
      : "progress.updated";

    const actorExternalId = boundedText(payload.actorExternalId ?? payload.userId, "", 200);
    const objectExternalId = boundedText(
      payload.objectExternalId ?? payload.activityId ?? payload.assignmentId,
      "",
      200,
    );
    const occurredAt = validIsoDate(payload.occurredAt ?? payload.timestamp) ?? new Date().toISOString();
    const explicitKey = boundedText(payload.eventKey ?? payload.id, "", 240);

    return {
      eventKey: explicitKey || deterministicEventKey(eventType, actorExternalId, objectExternalId, occurredAt),
      eventType,
      actorExternalId,
      objectExternalId,
      occurredAt,
      score: normalizedScore(payload.score),
      metadata: safeIntegrationMetadata(payload.metadata),
    };
  },
};

function required(value: string, field: string, errors: string[]) {
  if (!value.trim()) errors.push(`${field} is required.`);
}

export function validateCanonicalObject(
  objectType: CanonicalObjectType,
  value: CanonicalPerson | CanonicalClass | CanonicalEnrollment | CanonicalLearningEvent,
): AdapterValidationResult {
  const errors: string[] = [];

  if (objectType === "person") {
    const person = value as CanonicalPerson;
    required(person.externalId, "person.externalId", errors);
    if (!["student", "teacher", "admin"].includes(person.role)) errors.push("person.role is invalid.");
    if (person.email && person.email.length > 320) errors.push("person.email is too long.");
  } else if (objectType === "class") {
    const klass = value as CanonicalClass;
    required(klass.externalId, "class.externalId", errors);
    required(klass.name, "class.name", errors);
  } else if (objectType === "enrollment") {
    const enrollment = value as CanonicalEnrollment;
    required(enrollment.externalId, "enrollment.externalId", errors);
    required(enrollment.classExternalId, "enrollment.classExternalId", errors);
    required(enrollment.personExternalId, "enrollment.personExternalId", errors);
    if (!["student", "teacher"].includes(enrollment.role)) errors.push("enrollment.role is invalid.");
    if (!["active", "inactive"].includes(enrollment.status)) errors.push("enrollment.status is invalid.");
  } else {
    const event = value as CanonicalLearningEvent;
    required(event.eventKey, "event.eventKey", errors);
    required(event.actorExternalId, "event.actorExternalId", errors);
    required(event.objectExternalId, "event.objectExternalId", errors);
    if (!EVENT_TYPES.has(event.eventType)) errors.push("event.eventType is invalid.");
    if (Number.isNaN(new Date(event.occurredAt).valueOf())) errors.push("event.occurredAt is invalid.");
  }

  return { ok: errors.length === 0, errors };
}
