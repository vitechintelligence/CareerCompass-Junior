"use client";

import { useState } from "react";

type ActionState = "idle" | "testing" | "preparing" | "ready" | "error";

export default function IntegrationActions({
  organizationId,
  providerSlug,
  providerName,
  capabilities,
}: {
  organizationId: string;
  providerSlug: string;
  providerName: string;
  capabilities: string[];
}) {
  const [state, setState] = useState<ActionState>("idle");
  const [message, setMessage] = useState("");
  const [diagnosticMode, setDiagnosticMode] = useState<string | null>(null);

  async function testAdapter() {
    setState("testing");
    setMessage("");
    setDiagnosticMode(null);
    try {
      const response = await fetch("/api/integrations/diagnostics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId, providerSlug }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Adapter diagnostic failed.");

      const passed = Array.isArray(data?.checks)
        ? data.checks.filter((check: { ok?: boolean }) => check?.ok).length
        : 0;
      const total = Array.isArray(data?.checks) ? data.checks.length : 0;

      setDiagnosticMode(typeof data?.adapterMode === "string" ? data.adapterMode : null);
      setState("ready");
      setMessage(`Adapter verified: ${passed}/${total} checks passed. External authorization remains provider-specific.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Adapter diagnostic failed.");
    }
  }

  async function prepare() {
    setState("preparing");
    setMessage("");
    try {
      const response = await fetch("/api/integrations/installations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          providerSlug,
          displayLabel: providerName,
          scopes: capabilities,
          config: {},
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to prepare integration.");
      setState("ready");
      setMessage(
        data?.existing
          ? "Connection slot already exists."
          : "Connection slot prepared. Provider authorization can be completed server-side.",
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to prepare integration.");
    }
  }

  const busy = state === "testing" || state === "preparing";

  return (
    <div style={{ marginTop: 14 }}>
      <div className="actions">
        <button className="button soft" type="button" disabled={busy} onClick={testAdapter}>
          {state === "testing" ? "Testing adapter…" : "Test adapter"}
        </button>
        <button className="button soft" type="button" disabled={busy} onClick={prepare}>
          {state === "preparing" ? "Preparing…" : "Prepare connection"}
        </button>
      </div>
      {diagnosticMode && (
        <p className="muted" style={{ fontSize: 11, marginTop: 7 }}>
          Adapter mode: {diagnosticMode === "dedicated" ? "provider-specific" : "canonical generic"}
        </p>
      )}
      {message && (
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {message}
        </p>
      )}
    </div>
  );
}
