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
import { normalizeSubmissionId } from "@/lib/learning/idempotency";

export const dynamic = "force-dynamic";

const MAX_RESPONSE_BYTES = 32 * 1024;

type AttemptPayload = {
  bookCode?: string;
  unitCode?: string;
  activityCode?: string;
  contentVersion?: number;
  submissionId?: string;
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
  const submissionId = normalizeSubmissionId(payload.submissionId);
  const requestedEnrollmentId = payload.enrollmentId == null ? null : (isUuidReference(payload.enrollmentId) ? payload.enrollmentId : null);
  if (!bookCode || !unitCode || !activityCode) {
    return jsonError("Book, unit and activity codes are required.", 400);
  }
  if (!submissionId) {
    return jsonError("A valid submissionId is required.", 400);
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
  const completed = decision.level === "DEMONSTRATED";
  const score = decision.score;
  const evaluatedResponse = JSON.stringify({ learnerResponse: payload.response, evaluation: decision });
  const submissionHash = createHash("sha256")
    .update(`${profile.id}:${enrollmentId}:${String(ref.activity_id)}:${contractHash}:${evaluatedResponse}`)
    .digest("hex");

  const content = (ref.content || {}) as Record<string, unknown>;
  const rawTags = Array.isArray(content.skillTags)
    ? content.skillTags.map(String).filter(Boolean).slice(0, 20)
    : [];
  const skillTags = rawTags.length > 0 ? rawTags : ["english-communication", "future-readiness"];
  const evidenceSummaryBase = JSON.stringify({
    activityCode,
    activityContentVersion: contract.contentVersion,
    contractVersion: contract.contractVersion,
    contractHash,
    submissionId,
    score,
    level: decision.level,
    result: decision.result,
    completionRule: decision.completionRule,
    evidencePolicy: decision.evidencePolicy,
  });
  const integrityHash = createHash("sha256")
    .update(`${profile.semantic_id}:${bookCode}:${unitCode}:${activityCode}:${submissionId}:completed`)
    .digest("hex");
  const capsuleSemanticId = `${profile.semantic_id}-${bookCode}-${unitCode}-${activityCode}-${submissionId}`.toLowerCase();
  const organizationId = enrollment.organization_id;
  const classId = enrollment.class_id;

  let transactionResults;
  for (let serializableAttempt = 0; serializableAttempt < 2; serializableAttempt += 1) {
    try {
      transactionResults = await sql.transaction((txn) => {
        const queries = [
          txn`
            with allocated as (
              insert into learning_attempt_counters (activity_id, student_id, next_attempt, updated_at)
              values (${String(ref.activity_id)}, ${profile.id}, 1, now())
              on conflict (activity_id, student_id) do update set
                next_attempt=learning_attempt_counters.next_attempt + 1,
                updated_at=now()
              returning next_attempt
            )
            insert into activity_attempts (
              activity_id, student_id, enrollment_id, attempt_number, response,
              score, completion_status, submitted_at,
              activity_content_version, contract_version, activity_contract, contract_hash,
              submission_id, submission_hash
            )
            select
              ${String(ref.activity_id)}, ${profile.id}, ${enrollmentId}, allocated.next_attempt,
              ${evaluatedResponse}::jsonb, ${score}, ${decision.completionStatus}, now(),
              ${contract.contentVersion}, ${contract.contractVersion},
              ${JSON.stringify(contract)}::jsonb, ${contractHash},
              ${submissionId}::uuid, ${submissionHash}
            from allocated
            on conflict (submission_id) where submission_id is not null do update set
              submission_id=excluded.submission_id
            where activity_attempts.student_id=excluded.student_id
              and activity_attempts.activity_id=excluded.activity_id
              and activity_attempts.enrollment_id is not distinct from excluded.enrollment_id
              and activity_attempts.submission_hash=excluded.submission_hash
            returning id, attempt_number, submitted_at
          `,
          txn`
            with counts as (
              select
                (select count(*)::int
                 from activities a_total
                 where a_total.unit_id=${String(ref.unit_id)}
                   and a_total.status='published') as total_count,
                (select count(distinct aa.activity_id)::int
                 from activity_attempts aa
                 join activities a_done on a_done.id=aa.activity_id
                 where aa.student_id=${profile.id}
                   and aa.enrollment_id=${enrollmentId}
                   and aa.completion_status='completed'
                   and a_done.unit_id=${String(ref.unit_id)}
                   and a_done.status='published') as completed_count,
                (select count(*)::int
                 from activity_attempts aa_count
                 where aa_count.activity_id=${String(ref.activity_id)}
                   and aa_count.student_id=${profile.id}
                   and aa_count.enrollment_id=${enrollmentId}) as attempt_count
            ),
            upserted as (
              insert into book_progress (enrollment_id, unit_id, completion_percent, status, last_activity_at)
              select
                ${enrollmentId},
                ${String(ref.unit_id)},
                case when counts.total_count=0 then 0
                     else round((counts.completed_count::numeric / counts.total_count::numeric) * 100, 2)
                end,
                case
                  when counts.total_count > 0 and counts.completed_count >= counts.total_count then 'completed'
                  when counts.completed_count > 0 then 'in_progress'
                  else 'not_started'
                end,
                now()
              from counts
              on conflict (enrollment_id, unit_id) do update set
                completion_percent=excluded.completion_percent,
                status=excluded.status,
                last_activity_at=excluded.last_activity_at,
                updated_at=now()
              returning completion_percent, status, last_activity_at
            )
            select upserted.*, counts.attempt_count
            from upserted cross join counts
          `,
        ];

        if (completed && ref.evidence_eligible === true) {
          queries.push(txn`
            insert into learning_capsules (
              semantic_id, learner_id, organization_id, class_id, source_type, source_id,
              title_en, title_vi, evidence_summary, skill_tags, mastery_level,
              integrity_hash, status, sharing_scope, achieved_on
            )
            select
              ${capsuleSemanticId}, ${profile.id}, ${organizationId}, ${classId},
              'activity_attempt', aa.id::text, ${String(ref.title_en)}, ${String(ref.title_vi)},
              jsonb_set(${evidenceSummaryBase}::jsonb, '{attemptId}', to_jsonb(aa.id::text), true),
              ${skillTags}, 'demonstrated', ${integrityHash},
              'draft', 'learner', current_date
            from activity_attempts aa
            where aa.submission_id=${submissionId}::uuid
              and aa.student_id=${profile.id}
              and aa.activity_id=${String(ref.activity_id)}
              and aa.enrollment_id=${enrollmentId}
              and aa.submission_hash=${submissionHash}
            on conflict (semantic_id) do nothing
            returning id
          `);
        }

        return queries;
      }, { isolationLevel: "Serializable" });
      break;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";
      if (code === "40001" && serializableAttempt === 0) continue;
      throw error;
    }
  }

  if (!transactionResults) {
    return jsonError("learning_transaction_unavailable", 503);
  }

  const attemptResult = transactionResults[0]?.[0] as Record<string, unknown> | undefined;
  if (!attemptResult) {
    return jsonError("submission_id_conflict", 409);
  }
  const progressResult = transactionResults[1]?.[0] as Record<string, unknown> | undefined;
  const progressPercent = Math.round(Number(progressResult?.completion_percent || 0));
  const attemptCount = Number(progressResult?.attempt_count || 0);
  const capsuleCreated = completed && ref.evidence_eligible === true
    ? Boolean(transactionResults[2]?.[0])
    : false;

  return NextResponse.json({
    ok: true,
    synced: true,
    submissionId,
    attemptNumber: Number(attemptResult.attempt_number || 1),
    attemptCount,
    attemptId: String(attemptResult.id || ""),
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
