import { NextResponse } from "next/server";
import { requireProfessorViStudentAccess } from "@/lib/professor-vi/access";
import { getDb } from "@/lib/db";
import { learnerActivityContract, type ActivityContractV1 } from "@/lib/learning/activity-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorJson(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const { packId } = await params;
    if (!UUID_RE.test(packId)) return errorJson("invalid_quiz_pack", 400);
    const organizationId = new URL(request.url).searchParams.get("organizationId") || "";
    const { profile } = await requireProfessorViStudentAccess(organizationId);
    const sql = getDb();
    const packs = await sql`
      select id, title, grounding_refs
      from ai_study_packs
      where id=${packId}
        and learner_id=${profile.id}
        and organization_id=${organizationId}
        and pack_type='quiz'
        and review_status='released'
      limit 1
    `;
    if (!packs[0]) return errorJson("quiz_not_released", 404);
    const rows = await sql`
      select id, activity_contract
      from ai_generated_activities
      where pack_id=${packId}
        and learner_id=${profile.id}
        and organization_id=${organizationId}
        and status='released'
      order by created_at, activity_code
    `;
    const activities = rows.map((row) => ({
      id: String(row.id),
      launch: learnerActivityContract(row.activity_contract as ActivityContractV1, null),
    }));
    return NextResponse.json(
      { ok: true, pack: packs[0], activities },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "quiz_unavailable";
    return errorJson(code.includes("disabled") || code.includes("not_authorized") ? code : "quiz_unavailable", 403);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const { packId } = await params;
    if (!UUID_RE.test(packId)) return errorJson("invalid_quiz_pack", 400);
    const body = await request.json() as Record<string, unknown>;
    const organizationId = String(body.organizationId || "");
    const answers = Array.isArray(body.answers) ? body.answers : [];
    if (answers.length < 1 || answers.length > 20) return errorJson("invalid_quiz_submission", 400);

    const { profile } = await requireProfessorViStudentAccess(organizationId);
    const sql = getDb();
    const packs = await sql`
      select id
      from ai_study_packs
      where id=${packId}
        and learner_id=${profile.id}
        and organization_id=${organizationId}
        and pack_type='quiz'
        and review_status='released'
      limit 1
    `;
    if (!packs[0]) return errorJson("quiz_not_released", 404);

    const activityRows = await sql`
      select id, activity_contract
      from ai_generated_activities
      where pack_id=${packId}
        and learner_id=${profile.id}
        and organization_id=${organizationId}
        and status='released'
    `;
    const byId = new Map(activityRows.map((row) => [String(row.id), row.activity_contract as ActivityContractV1]));
    const results: Array<Record<string, unknown>> = [];

    for (const raw of answers) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return errorJson("invalid_quiz_submission", 400);
      const answer = raw as Record<string, unknown>;
      const activityId = String(answer.activityId || "");
      const selectedAnswerId = String(answer.selectedAnswerId || "");
      const submissionId = String(answer.submissionId || "");
      if (!UUID_RE.test(activityId) || !UUID_RE.test(submissionId) || !selectedAnswerId) {
        return errorJson("invalid_quiz_submission", 400);
      }

      const contract = byId.get(activityId);
      if (!contract) return errorJson("quiz_activity_not_available", 404);
      const definition = contract.answerDefinition as Record<string, unknown> | null;
      const correctAnswerId = definition?.correctAnswerId ? String(definition.correctAnswerId) : "";
      const options = Array.isArray((contract.content as Record<string, unknown>).options)
        ? (contract.content as Record<string, unknown>).options as Array<Record<string, unknown>>
        : [];
      if (!correctAnswerId || !options.some((option) => String(option.id || "") === selectedAnswerId)) {
        return errorJson("invalid_quiz_answer", 400);
      }

      const correct = selectedAnswerId === correctAnswerId;
      const evaluation = {
        outcome: correct ? "correct" : "incorrect",
        score: correct ? 1 : 0,
        criterionMet: correct,
        evaluationType: "deterministic",
        activityContentVersion: contract.contentVersion,
        contractVersion: contract.contractVersion,
      };
      const response = { selectedAnswerId };

      const inserted = await sql`
        insert into ai_generated_attempts (
          activity_id, learner_id, organization_id, submission_id,
          response, evaluation, evidence_level, teacher_review_status
        )
        values (
          ${activityId}, ${profile.id}, ${organizationId}, ${submissionId},
          ${JSON.stringify(response)}::jsonb, ${JSON.stringify(evaluation)}::jsonb,
          ${correct ? "DEMONSTRATED" : "PRACTICED"}, 'not_required'
        )
        on conflict (submission_id) do nothing
        returning id, evidence_level, evaluation
      `;

      if (!inserted[0]) {
        const prior = await sql`
          select id, activity_id, learner_id, organization_id, response, evaluation, evidence_level
          from ai_generated_attempts
          where submission_id=${submissionId}
          limit 1
        `;
        const row = prior[0];
        if (!row ||
            String(row.activity_id) !== activityId ||
            String(row.learner_id) !== profile.id ||
            String(row.organization_id) !== organizationId ||
            JSON.stringify(row.response) !== JSON.stringify(response)) {
          return errorJson("submission_id_conflict", 409);
        }
        results.push({ activityId, submissionId, evaluation: row.evaluation, evidenceLevel: row.evidence_level, deduplicated: true });
      } else {
        results.push({ activityId, submissionId, evaluation, evidenceLevel: correct ? "DEMONSTRATED" : "PRACTICED", deduplicated: false });
      }
    }

    return NextResponse.json(
      { ok: true, results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "quiz_submission_failed";
    const denied = code.includes("disabled") || code.includes("not_authorized");
    return errorJson(denied ? code : "quiz_submission_failed", denied ? 403 : 503);
  }
}
