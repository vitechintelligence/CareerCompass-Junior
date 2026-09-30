import "server-only";

import { createHash } from "node:crypto";
import { platformAiRuntime } from "@/lib/platform-ai-runtime";
import {
  buildProfessorViSystemPrompt,
  decideProfessorViMove,
  normalizeLearnerState,
  type ProfessorViInstitutionPolicy,
  type ProfessorViLearnerState,
  type ProfessorViLessonMode,
} from "@/lib/professor-vi/protocol";

type ProviderFile = {
  id: string;
  filename?: string;
  bytes?: number;
  expires_at?: number;
};

type RunInput = {
  fileId?: string | null;
  prompt: string;
  objective: string;
  learner: Partial<ProfessorViLearnerState> & { lessonMode: ProfessorViLessonMode };
  institution: ProfessorViInstitutionPolicy;
  taskRequiresAttempt?: boolean;
  safetyRisk?: boolean;
  maxOutputTokens?: number;
};

export type ProfessorViRunResult = {
  provider: "openai";
  model: string;
  text: string;
  pedagogicalState: string;
  decisionReason: string;
};

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as { output_text?: unknown; output?: unknown[] };
  if (typeof root.output_text === "string") return root.output_text.trim();

  for (const item of Array.isArray(root.output) ? root.output : []) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    for (const part of Array.isArray(content) ? content : []) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return String((part as { text: string }).text).trim();
      }
    }
  }
  return "";
}

function requireLivePlatformAi() {
  const runtime = platformAiRuntime();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (runtime.mode !== "openai" || !apiKey) {
    throw new Error("professor_vi_live_ai_unavailable");
  }
  return {
    apiKey,
    model: process.env.CCJ_PROFESSOR_VI_MODEL?.trim() || runtime.model,
  };
}

export async function uploadProfessorViSource(file: File, retentionDays: number) {
  const { apiKey } = requireLivePlatformAi();
  const maxBytes = 50 * 1024 * 1024;
  if (file.size < 1 || file.size > maxBytes) throw new Error("study_source_size_invalid");

  const form = new FormData();
  form.set("purpose", "user_data");
  form.set("file", file, file.name || "study-source");
  form.set("expires_after[anchor]", "created_at");
  form.set(
    "expires_after[seconds]",
    String(Math.max(86400, Math.min(31536000, Math.trunc(retentionDays) * 86400))),
  );

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey },
    body: form,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("study_source_upload_failed_" + response.status);

  const payload = await response.json() as ProviderFile;
  if (!payload.id) throw new Error("study_source_upload_missing_id");
  return payload;
}

export async function deleteProfessorViSource(providerFileId: string) {
  const { apiKey } = requireLivePlatformAi();
  const response = await fetch(
    "https://api.openai.com/v1/files/" + encodeURIComponent(providerFileId),
    {
      method: "DELETE",
      headers: { Authorization: "Bearer " + apiKey },
      cache: "no-store",
    },
  );
  return response.ok;
}

export async function runProfessorVi(input: RunInput): Promise<ProfessorViRunResult> {
  const { apiKey, model } = requireLivePlatformAi();
  const learner = normalizeLearnerState(input.learner);
  const decision = decideProfessorViMove({
    learner,
    institution: input.institution,
    taskRequiresAttempt: input.taskRequiresAttempt,
    safetyRisk: input.safetyRisk,
  });

  const systemPrompt = buildProfessorViSystemPrompt({
    learner,
    institution: input.institution,
    decision,
    objective: input.objective,
    sourceGrounded: Boolean(input.fileId),
  });

  const userContent: Array<Record<string, unknown>> = [];
  if (input.fileId) userContent.push({ type: "input_file", file_id: input.fileId });
  userContent.push({ type: "input_text", text: input.prompt });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_output_tokens: Math.max(120, Math.min(2400, input.maxOutputTokens ?? 1000)),
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
        { role: "user", content: userContent },
      ],
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("professor_vi_response_failed_" + response.status);

  const payload = await response.json();
  const text = outputText(payload);
  if (!text) throw new Error("professor_vi_empty_response");

  return {
    provider: "openai",
    model,
    text,
    pedagogicalState: decision.state,
    decisionReason: decision.reason,
  };
}

export function sourceHash(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function safeJsonFromModel(text: string) {
  const cleaned = text.trim()
    .replace(/^\x60\x60\x60(?:json)?\s*/i, "")
    .replace(/\s*\x60\x60\x60$/, "");
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return { text: cleaned };
  }
}
