import "server-only";

import { resolvePlatformAiPolicy } from "@/lib/platform-ai-policy";

export type PlatformAiTestResult = {
  ok: boolean;
  provider: "openai" | "mock";
  model: string;
  message: string;
  reason: string;
  openaiStatus?: number;
};

export function platformAiRuntime() {
  return resolvePlatformAiPolicy({
    hasApiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
    vercelEnv: process.env.VERCEL_ENV,
    explicitLiveEnabled: process.env.CCJ_PLATFORM_OPENAI_TEST_ENABLED === "true",
    forceMock: process.env.CCJ_PLATFORM_AI_FORCE_MOCK === "true",
    model: process.env.CCJ_OPENAI_TEST_MODEL || "gpt-6-luna",
    dailyRequestCap: Number(process.env.CCJ_OPENAI_DAILY_TEST_CAP || 5),
  });
}

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as { output_text?: unknown; output?: unknown[] };
  if (typeof root.output_text === "string") return root.output_text.trim();
  for (const item of Array.isArray(root.output) ? root.output : []) {
    if (!item || typeof item !== "object") continue;
    for (const part of Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : []) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return String((part as { text: string }).text).trim();
      }
    }
  }
  return "";
}

export async function runPlatformOpenAiConnectivityTest(): Promise<PlatformAiTestResult> {
  const runtime = platformAiRuntime();
  const connectivityModel = process.env.CCJ_OPENAI_CONNECTIVITY_MODEL?.trim() || "gpt-5.6";
  if (runtime.mode === "mock") {
    return {
      ok: true,
      provider: "mock",
      model: connectivityModel,
      message: "Career Compass AI test pipeline is ready in zero-cost mock mode.",
      reason: runtime.reason,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: true,
      provider: "mock",
      model: connectivityModel,
      message: "Career Compass AI test pipeline is ready in zero-cost mock mode.",
      reason: "openai_key_missing",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: connectivityModel,
        store: false,
        background: false,
        reasoning: { effort: "none" },
        max_output_tokens: 40,
        input: "Reply with exactly: CCJ OPENAI TEST OK",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        ok: true,
        provider: "mock",
        model: connectivityModel,
        message: "OpenAI was unavailable, so Career Compass safely continued in zero-cost mock mode.",
        reason: "openai_unavailable_fallback",
        openaiStatus: response.status,
      };
    }

    const payload = await response.json();
    const text = outputText(payload);
    return {
      ok: true,
      provider: "openai",
      model: connectivityModel,
      message: text || "CCJ OPENAI TEST OK",
      reason: runtime.reason,
    };
  } catch {
    return {
      ok: true,
      provider: "mock",
      model: connectivityModel,
      message: "OpenAI could not be reached, so Career Compass safely continued in zero-cost mock mode.",
      reason: "openai_network_fallback",
    };
  }
}
