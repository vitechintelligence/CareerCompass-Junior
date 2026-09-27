export type PlatformAiMode = "openai" | "mock";

export type PlatformAiPolicyInput = {
  hasApiKey: boolean;
  vercelEnv?: string | null;
  explicitLiveEnabled?: boolean;
  forceMock?: boolean;
  model?: string | null;
  dailyRequestCap?: number | null;
};

export type PlatformAiPolicyDecision = {
  mode: PlatformAiMode;
  model: string;
  dailyRequestCap: number;
  reason: string;
};

function boundedDailyCap(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(25, Math.trunc(Number(value))));
}

export function resolvePlatformAiPolicy(input: PlatformAiPolicyInput): PlatformAiPolicyDecision {
  const model = String(input.model || "").trim() || "gpt-6-luna";
  const dailyRequestCap = boundedDailyCap(input.dailyRequestCap);

  if (input.forceMock) {
    return { mode: "mock", model, dailyRequestCap, reason: "forced_mock" };
  }
  if (!input.hasApiKey) {
    return { mode: "mock", model, dailyRequestCap, reason: "openai_key_missing" };
  }

  const environment = String(input.vercelEnv || "").toLowerCase();
  const previewSafe = environment === "preview";
  if (previewSafe || input.explicitLiveEnabled === true) {
    return { mode: "openai", model, dailyRequestCap, reason: previewSafe ? "preview_openai" : "explicit_openai" };
  }

  return {
    mode: "mock",
    model,
    dailyRequestCap,
    reason: environment === "production" ? "production_live_not_enabled" : "live_not_enabled",
  };
}
