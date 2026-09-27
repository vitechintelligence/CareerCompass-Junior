import "server-only";

import { getDb } from "@/lib/db";
import { postAgsScore } from "@/lib/lti/service-client";
import { getCurrentLtiSession } from "@/lib/lti/session";

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export type LtiProgressPassbackResult =
  | { attempted: false; reason: string }
  | { attempted: true; ok: true; scoreGiven: number; scoreMaximum: 100 }
  | { attempted: true; ok: false; reason: string };

export async function tryLtiBookProgressPassback(input: {
  profileId: string;
  bookId: string;
  bookCode: string;
  enrollmentId: string;
}): Promise<LtiProgressPassbackResult> {
  const session = await getCurrentLtiSession();
  if (!session) return { attempted: false, reason: "no_lti_session" };
  if (String(session.profile_id) !== input.profileId) {
    return { attempted: false, reason: "lti_profile_mismatch" };
  }
  if (String(session.target_path || "") !== `/learn/${input.bookCode}`) {
    return { attempted: false, reason: "lti_resource_mismatch" };
  }

  const serviceClaims = record(session.service_claims);
  const ags = record(serviceClaims.ags);
  if (typeof ags.lineitem !== "string" || !ags.lineitem) {
    return { attempted: false, reason: "lti_ags_lineitem_not_present" };
  }

  const sql = getDb();
  const progress = await sql`
    select
      (
        select count(*)::int
        from activities a
        join book_units bu on bu.id=a.unit_id
        where bu.book_id=${input.bookId}
          and bu.status='published'
          and a.status='published'
      ) as total_count,
      (
        select count(distinct aa.activity_id)::int
        from activity_attempts aa
        join activities a on a.id=aa.activity_id
        join book_units bu on bu.id=a.unit_id
        where aa.student_id=${input.profileId}
          and aa.enrollment_id=${input.enrollmentId}
          and aa.completion_status='completed'
          and bu.book_id=${input.bookId}
          and bu.status='published'
          and a.status='published'
      ) as completed_count
  `;

  const total = Math.max(1, Number(progress[0]?.total_count || 0));
  const completed = Math.min(total, Math.max(0, Number(progress[0]?.completed_count || 0)));
  const scoreGiven = Math.round((completed / total) * 10000) / 100;

  try {
    await postAgsScore(session, {
      scoreGiven,
      scoreMaximum: 100,
      activityProgress: scoreGiven >= 100 ? "Completed" : "InProgress",
      gradingProgress: "FullyGraded",
    });
    return { attempted: true, ok: true, scoreGiven, scoreMaximum: 100 };
  } catch {
    return { attempted: true, ok: false, reason: "lti_ags_passback_unavailable" };
  }
}
