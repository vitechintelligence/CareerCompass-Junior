import {
  genericEducationAdapter,
  type CanonicalClass,
  type CanonicalEnrollment,
  type CanonicalPerson,
  type EducationIntegrationAdapter,
} from "./integration-adapter-core";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstRole(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(" ");
  return text(value);
}

const oneRosterAdapter: EducationIntegrationAdapter = {
  provider: "oneroster",
  normalizePerson(payload): CanonicalPerson {
    const metadata = payload.metadata && typeof payload.metadata === "object"
      ? payload.metadata as Record<string, unknown>
      : {};
    const givenName = text(payload.givenName);
    const familyName = text(payload.familyName);
    const role = firstRole(payload.role).toLowerCase();
    return {
      externalId: text(payload.sourcedId ?? payload.id),
      role: role.includes("teacher") || role.includes("instructor")
        ? "teacher"
        : role.includes("admin")
          ? "admin"
          : "student",
      displayName: text(payload.displayName) || `${givenName} ${familyName}`.trim() || undefined,
      email: text(payload.email ?? metadata.email) || undefined,
    };
  },
  normalizeClass(payload): CanonicalClass {
    return {
      externalId: text(payload.sourcedId ?? payload.id),
      name: text(payload.title ?? payload.name) || "Imported class",
      academicCycle: text(payload.term ?? payload.academicSessionId) || undefined,
      levelLabel: Array.isArray(payload.grades)
        ? payload.grades.map(String).join(", ")
        : text(payload.grade) || undefined,
    };
  },
  normalizeEnrollment(payload): CanonicalEnrollment {
    const user = payload.user && typeof payload.user === "object"
      ? payload.user as Record<string, unknown>
      : {};
    const klass = payload.class && typeof payload.class === "object"
      ? payload.class as Record<string, unknown>
      : {};
    const role = firstRole(payload.role).toLowerCase();
    const status = text(payload.status).toLowerCase();
    return {
      externalId: text(payload.sourcedId ?? payload.id),
      classExternalId: text(payload.classSourcedId ?? klass.sourcedId ?? payload.classId),
      personExternalId: text(payload.userSourcedId ?? user.sourcedId ?? payload.userId),
      role: role.includes("teacher") || role.includes("instructor") ? "teacher" : "student",
      status: status === "inactive" || status === "tobedeleted" || status === "deleted" ? "inactive" : "active",
    };
  },
  normalizeLearningEvent: genericEducationAdapter.normalizeLearningEvent,
};

const googleClassroomAdapter: EducationIntegrationAdapter = {
  provider: "google-classroom",
  normalizePerson(payload): CanonicalPerson {
    const profile = payload.profile && typeof payload.profile === "object"
      ? payload.profile as Record<string, unknown>
      : payload;
    const name = profile.name && typeof profile.name === "object"
      ? profile.name as Record<string, unknown>
      : {};
    const role = firstRole(payload.role ?? payload.roles).toLowerCase();
    return {
      externalId: text(payload.userId ?? profile.id ?? payload.id),
      role: role.includes("teacher") ? "teacher" : role.includes("admin") ? "admin" : "student",
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
    const courseId = text(payload.courseId ?? payload.classId);
    const userId = text(payload.userId ?? payload.profileId);
    return genericEducationAdapter.normalizeEnrollment({
      ...payload,
      externalId: payload.id ?? (courseId && userId ? `${courseId}:${userId}` : ""),
      classExternalId: courseId,
      personExternalId: userId,
      role: firstRole(payload.role ?? payload.roles),
    });
  },
  normalizeLearningEvent: genericEducationAdapter.normalizeLearningEvent,
};

const microsoftTeamsAdapter: EducationIntegrationAdapter = {
  provider: "microsoft-teams-edu",
  normalizePerson(payload) {
    const role = firstRole(payload.role ?? payload.roles);
    return genericEducationAdapter.normalizePerson({
      ...payload,
      externalId: payload.id ?? payload.userId,
      displayName: payload.displayName,
      email: payload.mail ?? payload.userPrincipalName ?? payload.email,
      role,
    });
  },
  normalizeClass(payload) {
    return genericEducationAdapter.normalizeClass({
      ...payload,
      externalId: payload.id ?? payload.classId,
      name: payload.displayName ?? payload.name,
    });
  },
  normalizeEnrollment(payload) {
    const classId = text(payload.classExternalId ?? payload.classId ?? payload.teamId);
    const personId = text(payload.personExternalId ?? payload.userId ?? payload.memberId);
    return genericEducationAdapter.normalizeEnrollment({
      ...payload,
      externalId: payload.id ?? (classId && personId ? `${classId}:${personId}` : ""),
      classExternalId: classId,
      personExternalId: personId,
      role: firstRole(payload.role ?? payload.roles),
    });
  },
  normalizeLearningEvent: genericEducationAdapter.normalizeLearningEvent,
};

const registry: Record<string, EducationIntegrationAdapter> = {
  oneroster: oneRosterAdapter,
  "google-classroom": googleClassroomAdapter,
  "microsoft-teams-edu": microsoftTeamsAdapter,
};

export function getEducationAdapter(providerSlug: string): EducationIntegrationAdapter {
  const normalized = text(providerSlug).toLowerCase();
  return registry[normalized] ?? { ...genericEducationAdapter, provider: normalized || "generic" };
}

export function hasDedicatedEducationAdapter(providerSlug: string) {
  return Boolean(registry[text(providerSlug).toLowerCase()]);
}

export const dedicatedEducationAdapterSlugs = Object.freeze(Object.keys(registry));
