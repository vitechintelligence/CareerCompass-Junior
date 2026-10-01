import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireProfessorViStudentAccess } from "@/lib/professor-vi/access";
import { loadProfessorViInstitutionPolicy, loadProfessorViLearnerState } from "@/lib/professor-vi/context";
import { runProfessorVi } from "@/lib/professor-vi/runtime";
import { getDb } from "@/lib/db";
import type { ProfessorViLessonMode, ProfessorViLearnerState } from "@/lib/professor-vi/protocol";
import { AuthorizationError, requireActiveProfile, isUuidReference } from "@/lib/auth/authorization";
import { readBoundedJson } from "@/lib/learning/request-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = new Set<ProfessorViLessonMode>(["english","career","steam","ai","reflection","assessment","math_science"]);

function errorJson(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    await requireActiveProfile(['student']);
    const body = await readBoundedJson(request);
    const organizationId = String(body.organizationId || "");
    const message = String(body.message || "").trim().slice(0, 6000);
    const sourceId = body.sourceId ? String(body.sourceId) : null;
    const requestedSessionId = body.sessionId ? String(body.sessionId) : null;
    const lessonMode = MODES.has(body.lessonMode as ProfessorViLessonMode)
      ? body.lessonMode as ProfessorViLessonMode
      : "ai";
    if (!message) return errorJson("professor_vi_message_required", 400);
    if(!isUuidReference(organizationId)||(sourceId&&!isUuidReference(sourceId))||(requestedSessionId&&!isUuidReference(requestedSessionId)))return errorJson('invalid_study_reference',400);

    const { profile } = await requireProfessorViStudentAccess(organizationId);
    const policy = await loadProfessorViInstitutionPolicy(organizationId);
    if (!policy.allowedModes.includes("socratic") && lessonMode !== "math_science") {
      return errorJson("socratic_tutoring_disabled", 403);
    }
    if (lessonMode === "math_science" && !policy.allowedModes.includes("math_science")) {
      return errorJson("math_science_tutoring_disabled", 403);
    }

    const sql = getDb();
    let providerFileId: string | null = null;
    let sourceRefs: Array<{ sourceId: string; label: string }> = [];
    if (sourceId) {
      const rows = await sql`
        select id, title, provider_file_id
        from ai_study_sources
        where id=${sourceId}
          and learner_id=${profile.id}
          and organization_id=${organizationId}
          and status='ready'
          and (expires_at is null or expires_at > now())
        limit 1
      `;
      if (!rows[0]?.provider_file_id) return errorJson("study_source_not_available", 404);
      providerFileId = String(rows[0].provider_file_id);
      sourceRefs = [{ sourceId, label: String(rows[0].title) }];
    }

    let sessionId = requestedSessionId;
    let learner: ProfessorViLearnerState;
    if (sessionId) {
      const sessions = await sql`
        select learner_state, status
        from ai_tutor_sessions
        where id=${sessionId}
          and learner_id=${profile.id}
          and organization_id=${organizationId}
          and status='active'
        limit 1
      `;
      if (!sessions[0]) return errorJson("professor_vi_session_not_available", 404);
      const prior = sessions[0].learner_state && typeof sessions[0].learner_state === "object"
        ? sessions[0].learner_state as Partial<ProfessorViLearnerState>
        : {};
      learner = {
        ...(await loadProfessorViLearnerState(profile.id, organizationId, lessonMode)),
        ...prior,
        lessonMode,
        attemptCount: Math.max(0, Number(prior.attemptCount || 0)) + 1,
        repeatedFailure: body.needMoreHelp === true
          ? Math.max(0, Number(prior.repeatedFailure || 0)) + 1
          : Math.max(0, Number(prior.repeatedFailure || 0)),
      };
    } else {
      sessionId = randomUUID();
      learner = await loadProfessorViLearnerState(profile.id, organizationId, lessonMode);
      learner.primaryLanguage = policy.primaryLanguage;
      await sql`
        insert into ai_tutor_sessions (
          id, learner_id, organization_id, source_id, lesson_mode,
          pedagogical_state, learner_state, status
        )
        values (
          ${sessionId}, ${profile.id}, ${organizationId}, ${sourceId}, ${lessonMode},
          'ASK', ${JSON.stringify(learner)}::jsonb, 'active'
        )
      `;
    }

    const result = await runProfessorVi({
      fileId: providerFileId,
      prompt: message,
      objective: lessonMode === "math_science"
        ? "Help the learner reason through Math or Science at an age-appropriate level without replacing their thinking."
        : "Help the learner understand, explain, apply and improve the current learning idea.",
      learner,
      institution: policy,
      taskRequiresAttempt: learner.attemptCount === 0,
      maxOutputTokens: 900,
    });

    await sql.transaction((txn) => [
      txn`
        insert into ai_tutor_messages (
          session_id, role, content, pedagogical_state, source_refs, educational_event
        )
        values (
          ${sessionId}, 'learner', ${message}, ${String(result.pedagogicalState)},
          ${JSON.stringify(sourceRefs)}::jsonb,
          ${JSON.stringify({ event: "learner_turn", lessonMode })}::jsonb
        )
      `,
      txn`
        insert into ai_tutor_messages (
          session_id, role, content, pedagogical_state, source_refs, educational_event
        )
        values (
          ${sessionId}, 'professor_vi', ${result.text}, ${String(result.pedagogicalState)},
          ${JSON.stringify(sourceRefs)}::jsonb,
          ${JSON.stringify({
            event: "professor_vi_turn",
            decisionReason: result.decisionReason,
            provider: result.provider,
            model: result.model,
          })}::jsonb
        )
      `,
      txn`
        update ai_tutor_sessions
        set pedagogical_state=${String(result.pedagogicalState)},
            learner_state=${JSON.stringify(learner)}::jsonb,
            updated_at=now()
        where id=${sessionId}
          and learner_id=${profile.id}
          and organization_id=${organizationId}
      `,
    ]);

    return NextResponse.json(
      {
        ok: true,
        sessionId,
        message: result.text,
        pedagogicalState: result.pedagogicalState,
        sourceRefs,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if(error instanceof AuthorizationError)return errorJson(error.code,error.status);
    const code = error instanceof Error ? error.message : "professor_vi_unavailable";
    if(code==='request_body_too_large')return errorJson(code,413);
    if(code==='request_origin_not_authorized')return errorJson(code,403);
    if(error instanceof SyntaxError||code==='invalid_request_body')return errorJson('invalid_request_body',400);
    const denied = code.includes("disabled") || code.includes("not_authorized") || code.includes("not_available");
    return errorJson(denied ? code : "professor_vi_unavailable", denied ? 403 : 503);
  }
}
