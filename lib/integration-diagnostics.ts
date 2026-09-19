import { safeIntegrationConfig, validateCanonicalObject } from "./integration-adapter-core";
import { getEducationAdapter, hasDedicatedEducationAdapter } from "./provider-adapters";

export type AdapterDiagnosticCheck = {
  objectType: "person" | "class" | "enrollment" | "event" | "config-security";
  ok: boolean;
  errors: string[];
};

function samples(providerSlug: string) {
  if (providerSlug === "oneroster") {
    return {
      person: { sourcedId: "person-101", role: "teacher", givenName: "Mai", familyName: "Tran", email: "mai@example.edu" },
      class: { sourcedId: "class-201", title: "English A1", grades: ["7"], academicSessionId: "2026-2027" },
      enrollment: { sourcedId: "enroll-301", classSourcedId: "class-201", userSourcedId: "person-101", role: "teacher", status: "active" },
      event: { id: "event-401", type: "progress.updated", userId: "person-101", activityId: "activity-501", timestamp: "2026-09-18T12:00:00Z", score: 88 },
    };
  }

  if (providerSlug === "google-classroom") {
    return {
      person: { userId: "g-user-101", role: "student", profile: { id: "g-user-101", name: { fullName: "An Nguyen" }, emailAddress: "an@example.edu" } },
      class: { id: "g-course-201", name: "Career Compass", section: "Teen A1" },
      enrollment: { id: "g-enroll-301", courseId: "g-course-201", userId: "g-user-101", role: "student", status: "active" },
      event: { id: "g-event-401", eventType: "assignment.submitted", userId: "g-user-101", assignmentId: "g-work-501", occurredAt: "2026-09-18T12:00:00Z" },
    };
  }

  if (providerSlug === "microsoft-teams-edu") {
    return {
      person: { id: "m-user-101", displayName: "Linh Pham", mail: "linh@example.edu", roles: ["student"] },
      class: { id: "m-team-201", displayName: "Mastery Beginner" },
      enrollment: { id: "m-enroll-301", teamId: "m-team-201", memberId: "m-user-101", roles: ["student"], status: "active" },
      event: { id: "m-event-401", type: "grade.updated", userId: "m-user-101", assignmentId: "m-task-501", timestamp: "2026-09-18T12:00:00Z", score: 92 },
    };
  }

  return {
    person: { id: "user-101", role: "student", name: "Demo Learner", email: "learner@example.edu" },
    class: { id: "class-201", name: "Demo Class", term: "2026-2027", grade: "A1" },
    enrollment: { id: "enroll-301", classId: "class-201", userId: "user-101", role: "student", status: "active" },
    event: { id: "event-401", type: "activity.completed", userId: "user-101", activityId: "activity-501", timestamp: "2026-09-18T12:00:00Z", score: 100 },
  };
}

export function runAdapterDiagnostic(providerSlug: string) {
  const adapter = getEducationAdapter(providerSlug);
  const input = samples(providerSlug);

  const normalized = {
    person: adapter.normalizePerson(input.person),
    class: adapter.normalizeClass(input.class),
    enrollment: adapter.normalizeEnrollment(input.enrollment),
    event: adapter.normalizeLearningEvent(input.event),
  };

  const checks: AdapterDiagnosticCheck[] = (
    ["person", "class", "enrollment", "event"] as const
  ).map((objectType) => {
    const validation = validateCanonicalObject(objectType, normalized[objectType]);
    return { objectType, ok: validation.ok, errors: validation.errors };
  });

  const scrubbed = safeIntegrationConfig({
    baseUrl: "https://example.edu/api",
    tokenUrl: "https://example.edu/oauth/token",
    nested: {
      clientSecret: "must-not-survive",
      accessToken: "must-not-survive",
      safeSetting: "kept",
    },
  });
  const nested = scrubbed.nested && typeof scrubbed.nested === "object"
    ? scrubbed.nested as Record<string, unknown>
    : {};
  const securityOk =
    scrubbed.baseUrl === "https://example.edu/api" &&
    scrubbed.tokenUrl === "https://example.edu/oauth/token" &&
    nested.safeSetting === "kept" &&
    !("clientSecret" in nested) &&
    !("accessToken" in nested);

  checks.push({
    objectType: "config-security",
    ok: securityOk,
    errors: securityOk ? [] : ["Nested credential scrubbing failed."],
  });

  return {
    ok: checks.every((check) => check.ok),
    provider: adapter.provider,
    adapterMode: hasDedicatedEducationAdapter(providerSlug) ? "dedicated" : "canonical-generic",
    checks,
    normalized,
  };
}
