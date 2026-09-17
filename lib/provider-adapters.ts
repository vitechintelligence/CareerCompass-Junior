import {
  genericEducationAdapter,
  type CanonicalClass,
  type CanonicalEnrollment,
  type CanonicalPerson,
  type EducationIntegrationAdapter,
} from "@/lib/integrations";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

const oneRosterAdapter: EducationIntegrationAdapter = {
  provider: "oneroster",
  normalizePerson(payload): CanonicalPerson {
    const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata as Record<string, unknown> : {};
    const givenName = text(payload.givenName);
    const familyName = text(payload.familyName);
    return {
      externalId: text(payload.sourcedId ?? payload.id),
      role: text(payload.role).toLowerCase().includes("teacher") ? "teacher" : text(payload.role).toLowerCase().includes("admin") ? "admin" : "student",
      displayName: text(payload.displayName) || `${givenName} ${familyName}`.trim() || undefined,
      email: text(payload.email ?? metadata.email) || undefined,
    };
  },
  normalizeClass(payload): CanonicalClass {
    return {
      externalId: text(payload.sourcedId ?? payload.id),
      name: text(payload.title ?? payload.name) || "Imported class",
      academicCycle: text(payload.term ?? payload.academicSessionId) || undefined,
      levelLabel: Array.isArray(payload.grades) ? payload.grades.map(String).join(", ") : text(payload.grade) || undefined,
    };
  },
  normalizeEnrollment(payload): CanonicalEnrollment {
    const user = payload.user && typeof payload.user === "object" ? payload.user as Record<string, unknown> : {};
    const klass = payload.class && typeof payload.class === "object" ? payload.class as Record<string, unknown> : {};
    return {
      externalId: text(payload.sourcedId ?? payload.id),
      classExternalId: text(payload.classSourcedId ?? klass.sourcedId ?? payload.classId),
      personExternalId: text(payload.userSourcedId ?? user.sourcedId ?? payload.userId),
      role: text(payload.role).toLowerCase().includes("teacher") ? "teacher" : "student",
      status: text(payload.status).toLowerCase() === "inactive" ? "inactive" : "active",
    };
  },
  normalizeLearningEvent: genericEducationAdapter.normalizeLearningEvent,
};

const googleClassroomAdapter: EducationIntegrationAdapter = {
  provider: "google-classroom",
  normalizePerson(payload): CanonicalPerson {
    const profile = payload.profile && typeof payload.profile === "object" ? payload.profile as Record<string, unknown> : {};
    const name = profile.name && typeof profile.name === "object" ? profile.name as Record<string, unknown> : {};
    return {
      externalId: text(payload.userId ?? payload.id),
      role: text(payload.role).toLowerCase().includes("teacher") ? "teacher" : "student",
      displayName: text(name.fullName ?? payload.displayName) || undefined,
      email: text(profile.emailAddress ?? payload.emailAddress ?? payload.email) || undefined,
    };
  },
  normalizeClass(payload): CanonicalClass {
    return {
      externalId: text(payload.id),
      name: text(payload.name) || "Google Classroom course",
      academicCycle: text(payload.section ?? payload.room) || undefined,
      levelLabel: text(payload.descriptionHeading) || undefined,
    };
  },
  normalizeEnrollment(payload): CanonicalEnrollment {
    return genericEducationAdapter.normalizeEnrollment({
      ...payload,
      externalId: payload.id ?? `${text(payload.courseId)}:${text(payload.userId)}`,
      classExternalId: payload.courseId ?? payload.classId,
      personExternalId: payload.userId,
    });
  },
  normalizeLearningEvent: genericEducationAdapter.normalizeLearningEvent,
};

const microsoftTeamsAdapter: EducationIntegrationAdapter = {
  provider: "microsoft-teams-edu",
  normalizePerson(payload) {
    return genericEducationAdapter.normalizePerson({
      ...payload,
      externalId: payload.id ?? payload.userId,
      displayName: payload.displayName,
      email: payload.mail ?? payload.userPrincipalName ?? payload.email,
    });
  },
  normalizeClass(payload) {
    return genericEducationAdapter.normalizeClass({ ...payload, externalId: payload.id, name: payload.displayName ?? payload.name });
  },
  normalizeEnrollment(payload) {
    return genericEducationAdapter.normalizeEnrollment(payload);
  },
  normalizeLearningEvent: genericEducationAdapter.normalizeLearningEvent,
};

const registry: Record<string, EducationIntegrationAdapter> = {
  oneroster: oneRosterAdapter,
  "google-classroom": googleClassroomAdapter,
  "microsoft-teams-edu": microsoftTeamsAdapter,
};

export function getEducationAdapter(providerSlug: string): EducationIntegrationAdapter {
  return registry[providerSlug] ?? { ...genericEducationAdapter, provider: providerSlug || "generic" };
}
