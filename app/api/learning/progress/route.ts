import { NextResponse } from "next/server";
import { AuthorizationError, isUuidReference, requireActiveProfile, resolveStudentLearningEnrollment } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function cleanCode(value: string | null) {
  return value && /^[A-Za-z0-9._-]{1,80}$/.test(value) ? value : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookCode = cleanCode(url.searchParams.get("bookCode"));
  const unitCode = cleanCode(url.searchParams.get("unitCode"));
  const enrollmentId = url.searchParams.get("enrollmentId");

  if (!bookCode || !unitCode || !enrollmentId || !isUuidReference(enrollmentId)) {
    return NextResponse.json({ error: "bookCode, unitCode and a valid enrollmentId are required." }, { status: 400 });
  }

  try {
    const profile = await requireActiveProfile(["student"]);
    const sql = getDb();
    const refs = await sql`
      select b.id as book_id, bu.id as unit_id
      from books b
      join book_units bu on bu.book_id=b.id
      where b.code=${bookCode}
        and b.status='published'
        and bu.code=${unitCode}
        and bu.status='published'
      limit 1
    `;
    const ref = refs[0];
    if (!ref) return NextResponse.json({ error: "Published learning unit not found." }, { status: 404 });

    const enrollment = await resolveStudentLearningEnrollment({
      profile,
      bookId: String(ref.book_id),
      requestedEnrollmentId: enrollmentId,
    });

    const rows = await sql`
      select
        a.id as activity_id,
        a.code as activity_code,
        a.content_version,
        count(aa.id)::int as attempt_count,
        (array_agg(aa.completion_status order by aa.attempt_number desc)
          filter (where aa.id is not null))[1] as latest_status,
        (array_agg(aa.score order by aa.attempt_number desc)
          filter (where aa.id is not null))[1] as latest_score,
        max(aa.submitted_at) as last_saved_at
      from activities a
      left join activity_attempts aa
        on aa.activity_id=a.id
       and aa.student_id=${profile.id}
       and aa.enrollment_id=${enrollment.id}
      where a.unit_id=${String(ref.unit_id)}
        and a.status='published'
      group by a.id
      order by a.sort_order, a.code
    `;

    const progressRows = await sql`
      select completion_percent, status, last_activity_at
      from book_progress
      where enrollment_id=${enrollment.id}
        and unit_id=${String(ref.unit_id)}
      limit 1
    `;

    return NextResponse.json({
      ok: true,
      enrollmentId: enrollment.id,
      bookCode,
      unitCode,
      unitProgress: progressRows[0] || {
        completion_percent: 0,
        status: "not_started",
        last_activity_at: null,
      },
      activities: rows.map((row) => ({
        activityId: String(row.activity_id),
        activityCode: String(row.activity_code),
        contentVersion: Number(row.content_version || 1),
        attemptCount: Number(row.attempt_count || 0),
        latestStatus: row.latest_status ? String(row.latest_status) : "not_started",
        latestScore: row.latest_score == null ? null : Number(row.latest_score),
        lastSavedAt: row.last_saved_at ? String(row.last_saved_at) : null,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
