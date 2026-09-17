import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureStudentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type AttemptPayload = {
  bookCode?: string;
  unitCode?: string;
  activityCode?: string;
  locale?: "en" | "vi";
  completed?: boolean;
  score?: number;
  response?: unknown;
};

function cleanCode(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(value) ? value : null;
}

export async function POST(request: Request) {
  let payload: AttemptPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const bookCode = cleanCode(payload.bookCode);
  const unitCode = cleanCode(payload.unitCode);
  const activityCode = cleanCode(payload.activityCode);
  if (!bookCode || !unitCode || !activityCode) {
    return NextResponse.json({ error: "Book, unit and activity codes are required." }, { status: 400 });
  }

  const locale = payload.locale === "en" ? "en" : "vi";
  const profile = await ensureStudentProfile(locale);
  if (!profile) {
    return NextResponse.json({ error: "Sign in to sync learning progress.", localOnly: true }, { status: 401 });
  }

  const sql = getDb();
  const refs = await sql`
    select
      b.id as book_id,
      bu.id as unit_id,
      a.id as activity_id,
      a.title_en,
      a.title_vi,
      a.max_score,
      a.evidence_eligible,
      a.content
    from books b
    join book_units bu on bu.book_id = b.id
    join activities a on a.unit_id = bu.id
    where b.code = ${bookCode}
      and b.status = 'published'
      and bu.code = ${unitCode}
      and bu.status = 'published'
      and a.code = ${activityCode}
      and a.status = 'published'
    limit 1
  `;

  const ref = refs[0];
  if (!ref) {
    return NextResponse.json({
      error: "This starter activity is not published to the database yet.",
      localOnly: true,
    }, { status: 409 });
  }

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
  const maxScore = ref.max_score == null ? 1 : Number(ref.max_score);
  const requestedScore = typeof payload.score === "number" && Number.isFinite(payload.score) ? payload.score : (completed ? maxScore : 0);
  const score = Math.max(0, Math.min(maxScore || 1, requestedScore));
  const responseJson = JSON.stringify(payload.response ?? {});

  const inserted = await sql`
    insert into activity_attempts (
      activity_id, student_id, enrollment_id, attempt_number, response,
      score, completion_status, submitted_at
    ) values (
      ${String(ref.activity_id)}, ${profile.id}, ${enrollmentId}, ${attemptNumber},
      ${responseJson}::jsonb, ${score}, ${completed ? "completed" : "submitted"}, now()
    )
    returning id
  `;

  let progressPercent = 0;
  let capsuleCreated = false;

  if (completed) {
    const progressRows = await sql`
      select
        (select count(*)::int from activities where unit_id = ${String(ref.unit_id)} and status = 'published') as total_count,
        (select count(distinct aa.activity_id)::int
          from activity_attempts aa
          join activities a2 on a2.id = aa.activity_id
          where aa.student_id = ${profile.id}
            and aa.enrollment_id = ${enrollmentId}
            and aa.completion_status = 'completed'
            and a2.unit_id = ${String(ref.unit_id)}
            and a2.status = 'published') as completed_count
    `;
    const total = Math.max(1, Number(progressRows[0]?.total_count ?? 1));
    const completedCount = Math.min(total, Number(progressRows[0]?.completed_count ?? 0));
    progressPercent = Math.round((completedCount / total) * 100);

    await sql`
      insert into book_progress (enrollment_id, unit_id, completion_percent, status, last_activity_at)
      values (${enrollmentId}, ${String(ref.unit_id)}, ${progressPercent}, ${progressPercent >= 100 ? "completed" : "in_progress"}, now())
      on conflict (enrollment_id, unit_id) do update set
        completion_percent = excluded.completion_percent,
        status = excluded.status,
        last_activity_at = excluded.last_activity_at,
        updated_at = now()
    `;

    if (ref.evidence_eligible === true) {
      const attemptId = String(inserted[0]?.id ?? "");
      const content = (ref.content || {}) as Record<string, unknown>;
      const rawTags = Array.isArray(content.skillTags) ? content.skillTags.map(String).filter(Boolean) : [];
      const skillTags = rawTags.length > 0 ? rawTags : ["english-communication", "future-readiness"];
      const evidenceSummary = JSON.stringify({ activityCode, score, maxScore, completionStatus: "completed" });
      const integrityHash = createHash("sha256")
        .update(`${profile.semantic_id}:${bookCode}:${unitCode}:${activityCode}:${attemptId}:completed`)
        .digest("hex");
      const capsuleSemanticId = `${profile.semantic_id}-${bookCode}-${unitCode}-${activityCode}`.toLowerCase();
      const organizationId = enrollments[0]?.organization_id ? String(enrollments[0].organization_id) : null;
      const classId = enrollments[0]?.class_id ? String(enrollments[0].class_id) : null;

      await sql`
        insert into learning_capsules (
          semantic_id, learner_id, organization_id, class_id, source_type, source_id,
          title_en, title_vi, evidence_summary, skill_tags, mastery_level,
          integrity_hash, status, sharing_scope, achieved_on
        ) values (
          ${capsuleSemanticId}, ${profile.id}, ${organizationId}, ${classId},
          'activity_attempt', ${attemptId}, ${String(ref.title_en)}, ${String(ref.title_vi)},
          ${evidenceSummary}::jsonb, ${skillTags}, 'demonstrated', ${integrityHash},
          'draft', 'learner', current_date
        )
        on conflict (semantic_id) do update set
          organization_id = excluded.organization_id,
          class_id = excluded.class_id,
          source_id = excluded.source_id,
          evidence_summary = excluded.evidence_summary,
          skill_tags = excluded.skill_tags,
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
    classScoped: Boolean(enrollments[0]?.class_id),
  });
}
