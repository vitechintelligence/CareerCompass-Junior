"use client";

import { useState } from "react";

type TestResult = {
  ok?: boolean;
  provider?: "openai" | "mock";
  model?: string;
  message?: string;
  reason?: string;
  dailyRequestCap?: number;
  environment?: string;
  error?: string;
};

export default function OpenAITestPanel() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function runTest() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/platform-ai/test", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "AI test failed.");
      setResult(payload);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "AI test failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="panel">
      <div className="eyebrow">ViTech platform AI test</div>
      <h2 className="workspaceTitle">OpenAI connection with zero-cost fallback</h2>
      <p className="muted">
        Platform administrators can test the server connection without enabling school BYOK. Preview deployments use OpenAI only when a server key is present; otherwise the same workflow stays operational in deterministic mock mode.
      </p>
      <div className="statusBanner">
        <strong>Spend guard</strong>
        <span>Live test calls are capped per administrator per day. Production stays mock-only unless explicitly enabled. Learner responses are never sent by this connectivity test.</span>
      </div>
      <div className="actions" style={{ marginTop: 14 }}>
        <button className="button primary" type="button" onClick={runTest} disabled={busy}>
          {busy ? "Testing OpenAI…" : "Run OpenAI connection test"}
        </button>
      </div>
      {result && (
        <div className="feedbackCard" style={{ marginTop: 14 }}>
          {result.error ? (
            <strong>{result.error}</strong>
          ) : (
            <>
              <div className="tagRow">
                <span className="tag">provider: {String(result.provider)}</span>
                <span className="tag">model: {String(result.model)}</span>
                {result.environment && <span className="tag">{result.environment}</span>}
              </div>
              <strong style={{ display: "block", marginTop: 10 }}>{String(result.message || "Test complete.")}</strong>
              <p className="muted" style={{ marginBottom: 0 }}>
                {result.provider === "openai"
                  ? "Live OpenAI connectivity is working."
                  : "The platform is safe to test, but no billable OpenAI call was used."}
              </p>
            </>
          )}
        </div>
      )}
    </article>
  );
}
