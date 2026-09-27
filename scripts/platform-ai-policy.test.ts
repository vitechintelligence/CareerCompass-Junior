import assert from "node:assert/strict";
import { test } from "node:test";
import { resolvePlatformAiPolicy } from "../lib/platform-ai-policy";

test("missing OpenAI key always stays in zero-cost mock mode", () => {
  const decision = resolvePlatformAiPolicy({ hasApiKey: false, vercelEnv: "preview" });
  assert.equal(decision.mode, "mock");
  assert.equal(decision.reason, "openai_key_missing");
});

test("preview with a key enables the platform OpenAI test lane", () => {
  const decision = resolvePlatformAiPolicy({ hasApiKey: true, vercelEnv: "preview" });
  assert.equal(decision.mode, "openai");
  assert.equal(decision.reason, "preview_openai");
});

test("production remains mock-only unless live testing is explicitly enabled", () => {
  const safe = resolvePlatformAiPolicy({ hasApiKey: true, vercelEnv: "production" });
  assert.equal(safe.mode, "mock");
  assert.equal(safe.reason, "production_live_not_enabled");

  const enabled = resolvePlatformAiPolicy({
    hasApiKey: true,
    vercelEnv: "production",
    explicitLiveEnabled: true,
  });
  assert.equal(enabled.mode, "openai");
  assert.equal(enabled.reason, "explicit_openai");
});

test("force mock overrides every live configuration", () => {
  const decision = resolvePlatformAiPolicy({
    hasApiKey: true,
    vercelEnv: "preview",
    explicitLiveEnabled: true,
    forceMock: true,
  });
  assert.equal(decision.mode, "mock");
  assert.equal(decision.reason, "forced_mock");
});

test("cost guard defaults and clamps the daily live-test cap", () => {
  assert.equal(resolvePlatformAiPolicy({ hasApiKey: false }).dailyRequestCap, 5);
  assert.equal(resolvePlatformAiPolicy({ hasApiKey: false, dailyRequestCap: 0 }).dailyRequestCap, 1);
  assert.equal(resolvePlatformAiPolicy({ hasApiKey: false, dailyRequestCap: 1000 }).dailyRequestCap, 25);
  assert.equal(resolvePlatformAiPolicy({ hasApiKey: false, dailyRequestCap: 3.8 }).dailyRequestCap, 3);
});

test("cost-sensitive Luna is the default live model", () => {
  assert.equal(resolvePlatformAiPolicy({ hasApiKey: true, vercelEnv: "preview" }).model, "gpt-6-luna");
});
