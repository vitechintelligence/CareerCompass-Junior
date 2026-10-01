import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireProfessorViStudentAccess } from "@/lib/professor-vi/access";
import { loadProfessorViInstitutionPolicy, loadProfessorViLearnerState } from "@/lib/professor-vi/context";
import { runProfessorVi, safeJsonFromModel } from "@/lib/professor-vi/runtime";
import { buildActivityContract, activityContractHash } from "@/lib/learning/activity-contract";
import { getDb } from "@/lib/db";
import { AuthorizationError, requireActiveProfile, isUuidReference } from "@/lib/auth/authorization";
import { readBoundedJson } from "@/lib/learning/request-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PackType = "summary" | "study_guide" | "quiz";

function errorJson(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function validPackType(value: unknown): value is PackType {
  return value === "summary" || value === "study_guide" || value === "quiz";
}

function cleanGrounding(value: unknown, sourceId: string, sourceTitle: string) {
  const refs = Array.isArray(value) ? value : [];
  const safe = refs.slice(0, 20).map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    return {
      sourceId,
      label: String(row.label || sourceTitle).slice(0, 160),
      locator: row.locator ? String(row.locator).slice(0, 120) : null,
      note: row.note ? String(row.note).slice(0, 300) : null,
    };
  }).filter(Boolean);
  return safe.length ? safe : [{ sourceId, label: sourceTitle, locator: null, note: "Grounded in the uploaded source." }];
}

function quizQuestions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const options = Array.isArray(row.options)
      ? row.options.slice(0, 5).map((option, optionIndex) => {
          if (!option || typeof option !== "object" || Array.isArray(option)) return null;
          const o = option as Record<string, unknown>;
          const id = String(o.id || String.fromCharCode(65 + optionIndex)).trim().slice(0, 20);
          const label = String(o.label || "").trim().slice(0, 500);
          return id && label ? { id, label } : null;
        }).filter(Boolean) as Array<{ id: string; label: string }>
      : [];
    const correctAnswerId = String(row.correctAnswerId || "").trim().slice(0, 20);
    const prompt = String(row.prompt || "").trim().slice(0, 1200);
    if (!prompt || options.length < 2 || !options.some((option) => option.id === correctAnswerId)) return null;
    return {
      id: String(row.id || "q" + (index + 1)).slice(0, 40),
      prompt,
      options,
      correctAnswerId,
      objective: String(row.objective || "Understand and apply the source material.").slice(0, 500),
      feedbackCorrect: String(row.feedbackCorrect || "Correct. Explain why that answer works.").slice(0, 500),
      feedbackIncorrect: String(row.feedbackIncorrect || "Not yet. Return to the source and try again.").slice(0, 500),
    };
  }).filter(Boolean) as Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
    correctAnswerId: string;
    objective: string;
    feedbackCorrect: string;
    feedbackIncorrect: string;
  }>;
}

function promptFor(packType: PackType, sourceTitle: string, learnerNote: string) {
  const grounding = "Use only the attached source for source-specific facts. Never invent page or slide numbers. If an exact locator is not visible, use null. ";
  if (packType === "quiz") {
    return grounding +
      "Create a customized quiz from '" + sourceTitle + "'. " +
      "Return STRICT JSON only with: title, groundingRefs, questions. " +
      "questions must contain 5 items when the source supports it; each item: id, prompt, options [{id,label}], correctAnswerId, objective, feedbackCorrect, feedbackIncorrect. " +
      "Use plausible distractors but exactly one correct answer. Adapt difficulty to the learner context. " +
      (learnerNote ? "Learner request: " + learnerNote : "");
  }
  const kind = packType === "summary" ? "clear source-grounded summary" : "structured study guide";
  return grounding +
    "Create a " + kind + " for '" + sourceTitle + "'. " +
    "Return STRICT JSON only with: title, contentMarkdown, groundingRefs. " +
    "contentMarkdown should identify key ideas, important terms, and questions the learner should be able to explain. " +
    "Do not copy long passages from the source. " +
    (learnerNote ? "Learner request: " + learnerNote : "");
}

export async function POST(request: Request) {
  try {
    await requireActiveProfile(['student']);
    const body = await readBoundedJson(request);
    const organizationId = String(body.organizationId || "");
    const sourceId = String(body.sourceId || "");
    const packType = body.packType;
    const learnerNote = String(body.learnerNote || "").trim().slice(0, 1000);
    if (!validPackType(packType)) return errorJson("invalid_study_pack_type", 400);
    if(!isUuidReference(sourceId)||!isUuidReference(organizationId))return errorJson('invalid_study_reference',400);

    const { profile } = await requireProfessorViStudentAccess(organizationId);
    const policy = await loadProfessorViInstitutionPolicy(organizationId);
    if (!policy.allowedModes.includes(packType)) return errorJson("study_pack_mode_disabled", 403);

    const sql = getDb();
    const sources = await sql`
      select id, title, provider_file_id, status
      from ai_study_sources
      where id=${sourceId}
        and learner_id=${profile.id}
        and organization_id=${organizationId}
        and status='ready'
        and (expires_at is null or expires_at > now())
      limit 1
    `;
    const source = sources[0];
    if (!source?.provider_file_id) return errorJson("study_source_not_available", 404);

    const learner = await loadProfessorViLearnerState(profile.id, organizationId, "ai");
    learner.primaryLanguage = policy.primaryLanguage;

    const result = await runProfessorVi({
      fileId: String(source.provider_file_id),
      prompt: promptFor(packType, String(source.title), learnerNote),
      objective: packType === "quiz"
        ? "Retrieve, explain and apply ideas from the learner's study source."
        : "Understand and organize the learner's study source.",
      learner,
      institution: policy,
      maxOutputTokens: packType === "quiz" ? 2200 : 1600,
    });
    const parsed = safeJsonFromModel(result.text);
    const title = String(parsed.title || (packType === "quiz" ? "Professor Vi Quiz" : "Professor Vi Study Pack")).slice(0, 200);
    const groundingRefs = cleanGrounding(parsed.groundingRefs, sourceId, String(source.title));
    const packId = randomUUID();
    const reviewStatus = policy.teacherReviewRequired ? "pending_review" : "released";

    if (packType !== "quiz") {
      const contentMarkdown = String(parsed.contentMarkdown || parsed.text || "").trim().slice(0, 30000);
      if (!contentMarkdown) return errorJson("study_pack_generation_invalid", 502);
      await sql`
        insert into ai_study_packs (
          id, learner_id, organization_id, source_id, pack_type, title, content,
          grounding_refs, model_provider, model_name, generation_mode,
          teacher_review_required, review_status
        )
        values (
          ${packId}, ${profile.id}, ${organizationId}, ${sourceId}, ${packType}, ${title},
          ${JSON.stringify({ contentMarkdown })}::jsonb, ${JSON.stringify(groundingRefs)}::jsonb,
          ${result.provider}, ${result.model}, 'live', ${policy.teacherReviewRequired}, ${reviewStatus}
        )
      `;
      return NextResponse.json(
        { ok: true, packId, packType, title, reviewStatus, ...(reviewStatus==='released'?{contentMarkdown}:{}), groundingRefs },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }

    const questions = quizQuestions(parsed.questions);
    if (questions.length < 1) return errorJson("generated_quiz_invalid", 502);

    const generated = questions.map((question, index) => {
      const activityId = randomUUID();
      const code = "AIQ-" + packId.slice(0, 8) + "-" + String(index + 1);
      const contract = buildActivityContract({
        activityId,
        activityCode: code,
        courseId: "AI-STUDY",
        unitId: sourceId,
        activityType: "multiple_choice",
        contentVersion: 1,
        ageBand: learner.ageBand,
        englishLevel: learner.cefr,
        objectiveEn: question.objective,
        objectiveVi: null,
        instructionsEn: "Choose the best answer, then explain your thinking.",
        instructionsVi: "Chọn đáp án phù hợp nhất, sau đó giải thích suy nghĩ của em.",
        content: {
          prompt: question.prompt,
          options: question.options,
          correctAnswerId: question.correctAnswerId,
          feedback: {
            correct: question.feedbackCorrect,
            incorrect: question.feedbackIncorrect,
          },
          sourceId,
          generatedBy: "professor_vi",
        },
      });
      return { activityId, code, contract, contractHash: activityContractHash(contract) };
    });

    await sql.transaction((txn) => {
      const queries = [
        txn`
          insert into ai_study_packs (
            id, learner_id, organization_id, source_id, pack_type, title, content,
            grounding_refs, model_provider, model_name, generation_mode,
            teacher_review_required, review_status
          )
          values (
            ${packId}, ${profile.id}, ${organizationId}, ${sourceId}, 'quiz', ${title},
            ${JSON.stringify({ questionCount: generated.length })}::jsonb,
            ${JSON.stringify(groundingRefs)}::jsonb,
            ${result.provider}, ${result.model}, 'live', ${policy.teacherReviewRequired}, ${reviewStatus}
          )
        `,
      ];
      for (const item of generated) {
        queries.push(txn`
          insert into ai_generated_activities (
            id, pack_id, learner_id, organization_id, source_id, activity_code,
            content_version, activity_contract, contract_hash, status
          )
          values (
            ${item.activityId}, ${packId}, ${profile.id}, ${organizationId}, ${sourceId}, ${item.code},
            1, ${JSON.stringify(item.contract)}::jsonb, ${item.contractHash},
            ${policy.teacherReviewRequired ? "draft" : "released"}
          )
        `);
      }
      return queries;
    });

    return NextResponse.json(
      {
        ok: true,
        packId,
        packType: "quiz",
        title,
        reviewStatus,
        questionCount: generated.length,
        groundingRefs,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if(error instanceof AuthorizationError)return errorJson(error.code,error.status);
    const code = error instanceof Error ? error.message : "study_pack_generation_failed";
    if(code==='request_body_too_large')return errorJson(code,413);
    if(code==='request_origin_not_authorized')return errorJson(code,403);
    if(error instanceof SyntaxError||code==='invalid_request_body')return errorJson('invalid_request_body',400);
    const denied = code.includes("disabled") || code.includes("not_authorized") || code.includes("not_available");
    return errorJson(denied ? code : "study_pack_generation_failed", denied ? 403 : 503);
  }
}
