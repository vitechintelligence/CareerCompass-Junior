import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureStudentProfile, getSessionUser } from "@/lib/auth/profile";
import { AuthorizationError, isUuidReference, resolveStudentLearningEnrollment } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { EvaluationError } from "@/lib/learning/objective-evaluation";
import { EvidencePolicyError, evaluateActivityEvidence } from "@/lib/learning/evidence-policy";
import {
  ActivityContractError,
  activityContractHash,
  buildActivityContract,
  requireActivityContentVersion,
} from "@/lib/learning/activity-contract";
import { readBoundedJson } from "@/lib/learning/request-json";

export const dynamic = "force-dynamic";

const MAX_RESPONSE_BYTES = 32 * 1024;

type AttemptPayload = {
  bookCode?: string;
  unitCode?: string;
  activityCode?: string;
  contentVersion?: number;
  enrollmentId?: string;
  locale?: "en" | "vi";
  response?: unknown;
};

function cleanCode(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(value) ? value : null;
}

function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let payload: AttemptPayload;
  try {
    const value = await readBoundedJson(request, 64 * 1024);
    if (!value || typeof value !== "object" || Array.isArray(value)) return jsonError("Invalid learning payload.", 400);
    payload = value as AttemptPayload;
  } catch (error) {
    return jsonError(error instanceof EvaluationError ? error.code : "invalid_json", error instanceof EvaluationError ? error.status : 400);
  }

  const bookCode = cleanCode(payload.bookCode);
  const unitCode = cleanCode(payload.unitCode);
  const activityCode = cleanCode(payload.activityCode);
  const requestedEnrollmentId = payload.enrollmentId == null ? null : (isUuidReference(payload.enrollmentId) ? payload.enrollmentId : null);
  if (!bookCode || !unitCode || !activityCode) {
    return jsonError("Book, unit and activity codes are required.", 400);
  }
  if (payload.enrollmentId != null && !requestedEnrollmentId) {
    return jsonError("Invalid enrollment reference.", 400);
  }

  const responseJson = JSON.stringify(payload.response ?? {});
  if (Buffer.byteLength(responseJson, "utf8") > MAX_RESPONSE_BYTES) {
    return jsonError("Learning response is too large.", 413);
  }

  const locale = payload.locale === "en" ? "en" : "vi";
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Sign in to sync learning progress.", 401, { localOnly: true });
  }

  const profile = await ensureStudentProfile(locale);
  if (!profile || profile.account_type !== "student" || profile.status !== "active") {
    return jsonError("Student access is required to write learning progress.", 403, { localOnly: true });
  }

  const sql = getDb();
  const refs = await sql`
    select
      b.id as book_id,
      bu.id as unit_id,
      a.id as activity_id,
      a.title_en,
      a.title_vi,
      a.activity_type,
      a.max_score,
      a.evidence_eligible,
      a.content,
      a.content_version,
      a.instructions_en,
      a.instructions_vi,
      b.age_band,
      b.level_label,
      bu.objective_en,
      bu.objective_vi
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
    return jsonError("This starter activity is not published to the database yet.", 409, { localOnly: true });
  }

  let contract;
  let contractHash;
  try {
    const currentContentVersion = Number(ref.content_version || 1);
    requireActivityContentVersion(payload.contentVersion, currentContentVersion);
    contract = buildActivityContract({
      activityId: String(ref.activity_id),
      activityCode,
      courseId: bookCode,
      unitId: unitCode,
      activityType: String(ref.activity_type),
      contentVersion: currentContentVersion,
      ageBand: ref.age_band ? String(ref.age_band) : null,
      englishLevel: ref.level_label ? String(ref.level_label) : null,
      objectiveEn: ref.objective_en ? String(ref.objective_en) : null,
      objectiveVi: ref.objective_vi ? String(ref.objective_vi) : null,
      instructionsEn: ref.instructions_en ? String(ref.instructions_en) : null,
      instructionsVi: ref.instructions_vi ? String(ref.instructions_vi) : null,
      content: ref.content,
    });
    contractHash = activityContractHash(contract);
  } catch (error) {
    if (error instanceof ActivityContractError) return jsonError(error.code, error.status);
    throw error;
  }

  let decision;
  try {
    decision = evaluateActivityEvidence({ activityType: String(ref.activity_type), content: ref.content, maxScore: ref.max_score }, payload.response);
  } catch (error) {
    if (error instanceof EvidencePolicyError) return jsonError(error.code, error.status);
    throw error;
  }

  let enrollment;
  try {
    enrollment = await resolveStudentLearningEnrollment({
      profile,
      bookId: String(ref.book_id),
      requestedEnrollmentId,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.code, error.status, { localOnly: true });
    }
    throw error;
  }

  const enrollmentId = enrollment.id;

  const attemptRows = await sql`
    select coalesce(max(attempt_number), 0)::int + 1 as next_attempt
    from activity_attempts
    where activity_id = ${String(ref.activity_id)}
      and student_id = ${profile.id}
  `;
  const attemptNumber = Number(attemptRows[0]?.next_attempt ?? 1);
  const completed = decision.level === "DEMONSTRATED";
  const score = decision.score;
  // Keep the raw learner response and the server's policy decision together. Never
  // alter historic attempts that used the old client-reported completion flag.
  const evaluatedResponse = JSON.stringify({ learnerResponse: payload.response, evaluation: decision });

  const inserted = await sql`
    insert into activity_attempts (
      activity_id, student_id, enrollment_id, attempt_number, response,
      score, completion_status, submitted_at,
      activity_content_version, contract_version, activity_contract, contract_hash
    ) values (
      ${String(ref.activity_id)}, ${profile.id}, ${enrollmentId}, ${attemptNumber},
      ${evaluatedResponse}::jsonb, ${score}, ${decision.completionStatus}, now(),
      ${contract.contentVersion}, ${contract.contractVersion},
      ${JSON.stringify(contract)}::jsonb, ${contractHash}
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
      const rawTags = Array.isArray(content.skillTags) ? content.skillTags.map(String).filter(Boolean).slice(0, 20) : [];
      const skillTags = rawTags.length > 0 ? rawTags : ["english-communication", "future-readiness"];
      const evidenceSummary = JSON.stringify({
        activityCode,
        activityContentVersion: contract.contentVersion,
        contractVersion: contract.contractVersion,
        contractHash,
        score,
        level: decision.level,
        result: decision.result,
        completionRule: decision.completionRule,
        evidencePolicy: decision.evidencePolicy,
        attemptId,
      });
      const integrityHash = createHash("sha256")
        .update(`${profile.semantic_id}:${bookCode}:${unitCode}:${activityCode}:${attemptId}:completed`)
        .digest("hex");
      const capsuleSemanticId = `${profile.semantic_id}-${bookCode}-${unitCode}-${activityCode}-${attemptId}`.toLowerCase();
      const organizationId = enrollment.organization_id;
      const classId = enrollment.class_id;

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
        on conflict (semantic_id) do nothing
      `;
      capsuleCreated = true;
    }
  }

  return NextResponse.json({
    ok: true,
    synced: true,
    attemptNumber,
    attemptId: String(inserted[0]?.id ?? ""),
    evaluation: decision,
    progressPercent,
    capsuleCreated,
    classScoped: Boolean(enrollment.class_id),
    enrollmentId,
    contentVersion: contract.contentVersion,
    contractVersion: contract.contractVersion,
    contractHash,
  }, { headers: { "Cache-Control": "no-store" } });
}
