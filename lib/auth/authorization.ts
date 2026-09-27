import { getCurrentProfile, type LmsProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import {
  isUuidReference,
  learningEnrollmentAllowsWrite,
  profileHasActiveRole,
  type LmsAccountType,
  type LearningEnrollmentAuthorizationRow,
} from "@/lib/auth/authorization-policy";

export { isUuidReference } from "@/lib/auth/authorization-policy";

export class AuthorizationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = "AuthorizationError";
  }
}

function invalidReference(label: string): never {
  throw new AuthorizationError(`invalid_${label}_reference`, 400);
}

export async function requireActiveProfile(allowedRoles: readonly LmsAccountType[]) {
  const profile = await getCurrentProfile();
  if (!profile) throw new AuthorizationError("authentication_required", 401);
  if (profile.status !== "active") throw new AuthorizationError("account_inactive", 403);
  if (!profileHasActiveRole(profile, allowedRoles)) throw new AuthorizationError("role_not_authorized", 403);
  return profile;
}

export async function requirePartnerOrganizationAccess(organizationId: string) {
  if (!isUuidReference(organizationId)) invalidReference("organization");
  const profile = await requireActiveProfile(["partner_admin", "platform_admin"]);
  const sql = getDb();

  const rows = profile.account_type === "platform_admin"
    ? await sql`
        select o.id
        from organizations o
        where o.id=${organizationId} and o.status='active'
        limit 1
      `
    : await sql`
        select o.id
        from organizations o
        join organization_memberships om on om.organization_id=o.id
        where o.id=${organizationId}
          and o.status='active'
          and om.profile_id=${profile.id}
          and om.role='partner_admin'
          and om.status='active'
        limit 1
      `;

  if (!rows[0]) throw new AuthorizationError("organization_not_authorized", 403);
  return { profile, organizationId };
}

export async function requirePartnerClassAccess(classId: string) {
  if (!isUuidReference(classId)) invalidReference("class");
  const sql = getDb();
  const rows = await sql`
    select c.organization_id
    from classes c
    join organizations o on o.id=c.organization_id
    where c.id=${classId}
      and c.status='active'
      and o.status='active'
    limit 1
  `;
  const organizationId = String(rows[0]?.organization_id || "");
  if (!organizationId) throw new AuthorizationError("class_not_available", 404);
  const { profile } = await requirePartnerOrganizationAccess(organizationId);
  return { profile, classId, organizationId };
}

export async function requireTeacherOrganizationAccess(organizationId: string) {
  if (!isUuidReference(organizationId)) invalidReference("organization");
  const profile = await requireActiveProfile(["teacher", "platform_admin"]);
  const sql = getDb();

  const rows = profile.account_type === "platform_admin"
    ? await sql`select id from organizations where id=${organizationId} and status='active' limit 1`
    : await sql`
        select o.id
        from organizations o
        join organization_memberships om on om.organization_id=o.id
        where o.id=${organizationId}
          and o.status='active'
          and om.profile_id=${profile.id}
          and om.role='teacher'
          and om.status='active'
        limit 1
      `;

  if (!rows[0]) throw new AuthorizationError("teacher_organization_not_authorized", 403);
  return { profile, organizationId };
}

export async function requireTeacherClassAccess(classId: string) {
  if (!isUuidReference(classId)) invalidReference("class");
  const profile = await requireActiveProfile(["teacher", "platform_admin"]);
  const sql = getDb();

  const rows = profile.account_type === "platform_admin"
    ? await sql`
        select c.id, c.organization_id
        from classes c
        join organizations o on o.id=c.organization_id
        where c.id=${classId} and c.status='active' and o.status='active'
        limit 1
      `
    : await sql`
        select c.id, c.organization_id
        from teacher_assignments ta
        join classes c on c.id=ta.class_id
        join organizations o on o.id=c.organization_id
        join organization_memberships om
          on om.organization_id=c.organization_id
         and om.profile_id=ta.teacher_id
         and om.role='teacher'
         and om.status='active'
        where ta.class_id=${classId}
          and ta.teacher_id=${profile.id}
          and c.status='active'
          and o.status='active'
        limit 1
      `;

  const organizationId = String(rows[0]?.organization_id || "");
  if (!organizationId) throw new AuthorizationError("teacher_class_not_authorized", 403);
  return { profile, classId, organizationId };
}

export async function requireOwnedTeacherClassroom(classId: string) {
  const context = await requireTeacherClassAccess(classId);
  const sql = getDb();
  const rows = context.profile.account_type === "platform_admin"
    ? await sql`
        select id from classes
        where id=${classId} and class_scope='teacher_custom' and status='active'
        limit 1
      `
    : await sql`
        select id from classes
        where id=${classId}
          and class_scope='teacher_custom'
          and owner_teacher_id=${context.profile.id}
          and status='active'
        limit 1
      `;
  if (!rows[0]) throw new AuthorizationError("teacher_classroom_not_owned", 403);
  return context;
}

export async function requireStudentClassAccess(classId: string, profile?: LmsProfile) {
  if (!isUuidReference(classId)) invalidReference("class");
  const learner = profile ?? await requireActiveProfile(["student"]);
  if (!profileHasActiveRole(learner, ["student"])) throw new AuthorizationError("student_access_required", 403);

  const sql = getDb();
  const rows = await sql`
    select c.id, c.organization_id
    from class_memberships cm
    join classes c on c.id=cm.class_id
    join organizations o on o.id=c.organization_id
    join organization_memberships om
      on om.organization_id=c.organization_id
     and om.profile_id=cm.student_id
     and om.role='student'
     and om.status='active'
    where cm.class_id=${classId}
      and cm.student_id=${learner.id}
      and cm.status='active'
      and c.status='active'
      and o.status='active'
    limit 1
  `;
  if (!rows[0]) throw new AuthorizationError("student_class_not_authorized", 403);
  return { profile: learner, classId, organizationId: String(rows[0].organization_id) };
}

function normalizeEnrollmentRow(row: Record<string, unknown>): LearningEnrollmentAuthorizationRow {
  return {
    id: String(row.id || ""),
    student_id: String(row.student_id || ""),
    book_id: String(row.book_id || ""),
    status: String(row.status || ""),
    class_id: row.class_id ? String(row.class_id) : null,
    organization_id: row.organization_id ? String(row.organization_id) : null,
    class_status: row.class_status ? String(row.class_status) : null,
    organization_status: row.organization_status ? String(row.organization_status) : null,
    class_membership_status: row.class_membership_status ? String(row.class_membership_status) : null,
    organization_membership_status: row.organization_membership_status ? String(row.organization_membership_status) : null,
    organization_membership_role: row.organization_membership_role ? String(row.organization_membership_role) : null,
  };
}

async function fetchEnrollment(profile: LmsProfile, bookId: string, enrollmentId?: string | null) {
  const sql = getDb();
  const rows = await sql`
    select
      se.id, se.student_id, se.book_id, se.status, se.class_id,
      c.organization_id,
      c.status as class_status,
      o.status as organization_status,
      cm.status as class_membership_status,
      om.status as organization_membership_status,
      om.role as organization_membership_role
    from student_enrollments se
    left join classes c on c.id=se.class_id
    left join organizations o on o.id=c.organization_id
    left join class_memberships cm on cm.class_id=se.class_id and cm.student_id=se.student_id
    left join organization_memberships om
      on om.organization_id=c.organization_id
     and om.profile_id=se.student_id
     and om.role='student'
    where se.student_id=${profile.id}
      and se.book_id=${bookId}
      and (${enrollmentId || null}::uuid is null or se.id=${enrollmentId || null}::uuid)
      and (se.class_id is not null or ${enrollmentId || null}::uuid is null or se.id=${enrollmentId || null}::uuid)
    order by se.enrolled_at desc
  `;

  for (const raw of rows) {
    const row = normalizeEnrollmentRow(raw as Record<string, unknown>);
    if (learningEnrollmentAllowsWrite(row, {
      studentId: profile.id,
      bookId,
      enrollmentId: enrollmentId || null,
    })) return row;
  }
  return null;
}

export async function resolveStudentLearningEnrollment(input: {
  profile: LmsProfile;
  bookId: string;
  requestedEnrollmentId?: string | null;
}) {
  if (!profileHasActiveRole(input.profile, ["student"])) {
    throw new AuthorizationError("student_access_required", 403);
  }
  if (!isUuidReference(input.bookId)) invalidReference("book");
  if (input.requestedEnrollmentId && !isUuidReference(input.requestedEnrollmentId)) invalidReference("enrollment");

  if (input.requestedEnrollmentId) {
    const enrollment = await fetchEnrollment(input.profile, input.bookId, input.requestedEnrollmentId);
    if (!enrollment) throw new AuthorizationError("learning_enrollment_not_authorized", 403);
    return enrollment;
  }

  const sql = getDb();
  let enrollment = await fetchEnrollment(input.profile, input.bookId, null);
  if (enrollment?.class_id === null) return enrollment;

  await sql`
    insert into student_enrollments (student_id, book_id, class_id, status)
    values (${input.profile.id}, ${input.bookId}, null, 'active')
    on conflict do nothing
  `;

  enrollment = await fetchEnrollment(input.profile, input.bookId, null);
  if (!enrollment || enrollment.class_id !== null) {
    throw new AuthorizationError("personal_learning_enrollment_unavailable", 409);
  }
  return enrollment;
}
