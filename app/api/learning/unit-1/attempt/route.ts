import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureStudentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const TOTAL_LESSONS = 8;

export async function POST(request: Request) {
  let payload: {
    lessonId?: number;
    completed?: boolean;
    locale?: "en" | "vi";
    response?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const lessonId = Number(payload.lessonId);
  if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > TOTAL_LESSONS) {
    return NextResponse.json({ error: "Invalid lesson." }, { status: 400 });
  }

  const locale = payload.locale === "en" ? "en" : "vi";
  const profile = await ensureStudentProfile(locale);
  if (!profile) {
    return NextResponse.json({ error: "Sign in to sync learning progress." }, { status: 401 });
  }

  const sql = getDb();
  const activityCode = `U01-L${String(lessonId).padStart(2, "0")}`;
  const refs = await sql`
    select
      b.id as book_id,
      bu.id as unit_id,
      a.id as activity_id,
      a.title_en,
      a.title_vi,
      a.evidence_eligible
    from books b
    join book_units bu on bu.book_id = b.id
    join activities a on a.unit_id = bu.id
    where b.code = 'CCJ-MASTERY-BEGINNER'
      and bu.code = 'U01'
      and a.code = ${activityCode}
      and a.status = 'published'
    limit 1
  `;

  const ref = refs[0];
  if (!ref) {
    return NextResponse.json({ error: "Curriculum activity is not published." }, { status: 409 });
  }

  // Prefer a partner-managed class enrollment when one exists. Only learners who
  // are not attached to a class use the personal/unclassed enrollment fallback.
  let enrollments = await sql`
    select se.id, se.class_id, c.organization_id
    from student_enrollments se
    left join classes c on c.id = se.class_id
    where se.student_id = ${profile.id}
      and se.book_id = ${String(ref.book_id)}
      and se.status in ('active','completed')
    order by (se.class_id is null) asc, se.enrolled_at desc
    limit 1
  `;

  if (!enrollments[0]) {
    await sql`
      insert into student_enrollments (student_id, book_id, status)
      values (${profile.id}, ${String(ref.book_id)}, 'active')
      on conflict do nothing
    `;
    enrollments = await sql`
      select se.id, se.class_id, c.organization_id
      from student_enrollments se
      left join classes c on c.id = se.class_id
      where se.student_id = ${profile.id}
        and se.book_id = ${String(ref.book_id)}
      order by (se.class_id is null) asc, se.enrolled_at desc
      limit 1
    `;
  }

  const enrollmentId = String(enrollments[0]?.id ?? "");
  const classId = enrollments[0]?.class_id ? String(enrollments[0].class_id) : null;
  const organizationId = enrollments[0]?.organization_id ? String(enrollments[0].organization_id) : null;
  if (!enrollmentId) {
    return NextResponse.json({ error: "Unable to create learner enrollment." }, { status: 500 });
  }

  const attemptRows = await sql`
    select coalesce(max(attempt_number), 0)::int + 1 as next_attempt
    from activity_attempts
    where activity_id = ${String(ref.activity_id)}
      and student_id = ${profile.id}
  `;
  const attemptNumber = Number(attemptRows[0]?.next_attempt ?? 1);
  const completed = payload.completed === true;
  const responseJson = JSON.stringify(payload.response ?? {});

  const inserted = await sql`
    insert into activity_attempts (
      activity_id,
      student_id,
      enrollment_id,
      attempt_number,
      response,
      score,
      completion_status,
      submitted_at
    )
    values (
      ${String(ref.activity_id)},
      ${profile.id},
      ${enrollmentId},
      ${attemptNumber},
      ${responseJson}::jsonb,
      ${completed ? 1 : 0},
      ${completed ? "completed" : "submitted"},
      now()
    )
    returning id
  `;

  let progressPercent = 0;
  let capsuleCreated = false;

  if (completed) {
    const completedRows = await sql`
      select count(distinct a.code)::int as completed_count
      from activity_attempts aa
      join activities a on a.id = aa.activity_id
      where aa.student_id = ${profile.id}
        and aa.enrollment_id = ${enrollmentId}
        and aa.completion_status = 'completed'
        and a.unit_id = ${String(ref.unit_id)}
        and a.code like 'U01-L%'
    `;
    const completedCount = Math.min(TOTAL_LESSONS, Number(completedRows[0]?.completed_count ?? 0));
    progressPercent = Math.round((completedCount / TOTAL_LESSONS) * 100);
    const progressStatus = progressPercent >= 100 ? "completed" : "in_progress";

    await sql`
      insert into book_progress (
        enrollment_id,
        unit_id,
        completion_percent,
        status,
        last_activity_at
      )
      values (
        ${enrollmentId},
        ${String(ref.unit_id)},
        ${progressPercent},
        ${progressStatus},
        now()
      )
      on conflict (enrollment_id, unit_id) do update set
        completion_percent = excluded.completion_percent,
        status = excluded.status,
        last_activity_at = excluded.last_activity_at,
        updated_at = now()
    `;

    if (ref.evidence_eligible === true) {
      const attemptId = String(inserted[0]?.id ?? "");
      const evidenceSummary = JSON.stringify({
        activityCode,
        score: 1,
        completionStatus: "completed",
      });
      const integrityHash = createHash("sha256")
        .update(`${profile.semantic_id}:${activityCode}:${attemptId}:completed`)
        .digest("hex");
      const capsuleSemanticId = `${profile.semantic_id}-${activityCode.toLowerCase()}`;

      await sql`
        insert into learning_capsules (
          semantic_id,
          learner_id,
          organization_id,
          class_id,
          source_type,
          source_id,
          title_en,
          title_vi,
          evidence_summary,
          skill_tags,
          mastery_level,
          integrity_hash,
          status,
          sharing_scope,
          achieved_on
        )
        values (
          ${capsuleSemanticId},
          ${profile.id},
          ${organizationId},
          ${classId},
          'activity_attempt',
          ${attemptId},
          ${String(ref.title_en)},
          ${String(ref.title_vi)},
          ${evidenceSummary}::jsonb,
          array['english-communication','self-awareness'],
          'demonstrated',
          ${integrityHash},
          'draft',
          'learner',
          current_date
        )
        on conflict (semantic_id) do update set
          organization_id = excluded.organization_id,
          class_id = excluded.class_id,
          source_id = excluded.source_id,
          evidence_summary = excluded.evidence_summary,
          integrity_hash = excluded.integrity_hash,
          updated_at = now()
      `;
      capsuleCreated = true;
    }
  }

  return NextResponse.json({
    ok: true,
    synced: true,
    attemptNumber,
    progressPercent,
    capsuleCreated,
    classScoped: Boolean(classId),
  });
}
