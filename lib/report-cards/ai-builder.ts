import "server-only";

import { reportCardPreset, type ReportCardTemplateSchema } from "@/lib/report-cards/templates";
import { buildReportCardDraft, sanitizeAiReportCardTemplate, type ReportCardBuilderAnswers } from "@/lib/report-cards/builder";
import { intelligenceRuntimeAvailability } from "@/lib/exchange/runtime-policy";

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

export type ReportCardBuilderResult = {
  schema: ReportCardTemplateSchema;
  generationMode: "ai" | "deterministic";
  model: string | null;
};

export async function runReportCardBuilder(input: {
  answers: ReportCardBuilderAnswers;
  uploadedTemplate?: File | null;
}): Promise<ReportCardBuilderResult> {
  const fallback = buildReportCardDraft(input.answers);
  const enabled = process.env.CCJ_REPORT_CARD_AI_BUILDER_LIVE_ENABLED === "true";
  const forceMock = process.env.CCJ_PLATFORM_AI_FORCE_MOCK === "true";
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!enabled || forceMock || !apiKey || !intelligenceRuntimeAvailability().available) {
    if(input.uploadedTemplate)throw Error('report_card_import_requires_connected_runtime');
    return { schema: fallback, generationMode: "deterministic", model: null };
  }

  const model = process.env.CCJ_REPORT_CARD_AI_MODEL?.trim() || "gpt-6-luna";
  const base = reportCardPreset(input.answers.countryCode, input.answers.educationLevel);
  const content: Array<Record<string, unknown>> = [];

  if (input.uploadedTemplate && input.uploadedTemplate.size > 0) {
    if (input.uploadedTemplate.size > 3 * 1024 * 1024) throw new Error("report_card_import_too_large");
    const bytes = Buffer.from(await input.uploadedTemplate.arrayBuffer()).toString("base64");
    const mime = input.uploadedTemplate.type || "application/pdf";
    content.push({
      type: "input_file",
      filename: "blank-school-report-card.pdf",
      file_data: "data:" + mime + ";base64," + bytes,
      detail: mime === "application/pdf" ? "high" : undefined,
    });
  }

  content.push({
    type: "input_text",
    text: [
      "You are the Career Compass Junior Report Card Studio builder.",
      "Your job is to convert the institution's stated requirements and, if attached, its existing report-card form into an editable report-card schema.",
      "The school is the authority. Do not invent government requirements or silently change grading policy.",
      "Preserve the existing school form closely when one is attached.",
      "A country preset is a starting structure only. Do not claim legal compliance.",
      "Return STRICT JSON only matching this shape:",
      JSON.stringify({
        title: "string",
        subtitle: "optional string",
        orientation: "portrait | landscape",
        sections: [{
          key: "string",
          title: "string",
          fields: [{
            key: "string",
            label: "string",
            type: "text | date | number | select | signature | table | photo",
            required: false,
            options: ["optional"],
            columns: [{ key: "string", label: "string" }],
          }],
        }],
      }),
      "Institution answers:",
      JSON.stringify(input.answers),
      "Safe starting preset:",
      JSON.stringify(base),
    ].join("\n"),
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      background: false,
      max_output_tokens: 3500,
      input: [{ role: "user", content }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error("report_card_ai_builder_failed_" + response.status);

  const text = outputText(await response.json());
  const cleaned = text.replace(/^\x60\x60\x60(?:json)?\s*/i, "").replace(/\s*\x60\x60\x60$/, "");
  let parsed: unknown = null;
  try { parsed = JSON.parse(cleaned); } catch { return { schema: fallback, generationMode: "deterministic", model: null }; }

  return {
    schema: sanitizeAiReportCardTemplate(parsed, fallback),
    generationMode: "ai",
    model,
  };
}
