import { getDb } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LearnerEnrollment = {
  id: string;
  classId: string | null;
  organizationId: string | null;
};

export async function resolveLearnerEnrollment({
  profileId,
  bookId,
  requestedEnrollmentId,
}: {
  profileId: string;
  bookId: string;
  requestedEnrollmentId?: string | null;
}): Promise<LearnerEnrollment | null> {
  const sql = getDb();

  if (requestedEnrollmentId) {
    if (!UUID_RE.test(requestedEnrollmentId)) return null;
    const rows = await sql`
      select se.id, se.class_id, c.organization_id
      from student_enrollments se
      left join classes c on c.id = se.class_id
      where se.id = ${requestedEnrollmentId}
        and se.student_id = ${profileId}
        and se.book_id = ${bookId}
        and se.status in ('active','completed')
      limit 1
    `;
    if (!rows[0]) return null;
    return {
      id: String(rows[0].id),
      classId: rows[0].class_id ? String(rows[0].class_id) : null,
      organizationId: rows[0].organization_id ? String(rows[0].organization_id) : null,
    };
  }

  let rows = await sql`
    select se.id, se.class_id, null::uuid as organization_id
    from student_enrollments se
    where se.student_id = ${profileId}
      and se.book_id = ${bookId}
      and se.class_id is null
      and se.status in ('active','completed')
    order by se.enrolled_at desc
    limit 1
  `;

  if (!rows[0]) {
    await sql`
      insert into student_enrollments (student_id, book_id, status)
      values (${profileId}, ${bookId}, 'active')
      on conflict (student_id, book_id) where class_id is null do nothing
    `;
    rows = await sql`
      select se.id, se.class_id, null::uuid as organization_id
      from student_enrollments se
      where se.student_id = ${profileId}
        and se.book_id = ${bookId}
        and se.class_id is null
        and se.status in ('active','completed')
      order by se.enrolled_at desc
      limit 1
    `;
  }

  if (!rows[0]) return null;
  return { id: String(rows[0].id), classId: null, organizationId: null };
}
