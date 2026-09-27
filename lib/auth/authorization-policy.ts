export type LmsAccountType = "student" | "teacher" | "partner_admin" | "platform_admin";

export type AuthorizationProfileShape = {
  id: string;
  account_type: LmsAccountType;
  status: string;
};

export function isUuidReference(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function profileHasActiveRole(
  profile: AuthorizationProfileShape | null | undefined,
  allowedRoles: readonly LmsAccountType[],
): profile is AuthorizationProfileShape {
  return Boolean(profile && profile.status === "active" && allowedRoles.includes(profile.account_type));
}

export type LearningEnrollmentAuthorizationRow = {
  id: string;
  student_id: string;
  book_id: string;
  status: string;
  class_id: string | null;
  organization_id: string | null;
  class_status: string | null;
  organization_status: string | null;
  class_membership_status: string | null;
  organization_membership_status: string | null;
  organization_membership_role: string | null;
};

export function learningEnrollmentAllowsWrite(
  row: LearningEnrollmentAuthorizationRow | null | undefined,
  expected: { studentId: string; bookId: string; enrollmentId?: string | null },
) {
  if (!row) return false;
  if (row.id !== expected.enrollmentId && expected.enrollmentId) return false;
  if (row.student_id !== expected.studentId || row.book_id !== expected.bookId || row.status !== "active") return false;

  if (row.class_id === null) {
    return row.organization_id === null;
  }

  return row.class_status === "active"
    && row.organization_status === "active"
    && row.class_membership_status === "active"
    && row.organization_membership_status === "active"
    && row.organization_membership_role === "student"
    && Boolean(row.organization_id);
}
