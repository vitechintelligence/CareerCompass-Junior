"use client";

import { useState } from "react";

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
  const [state, setState] = useState<"idle" | "working" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  async function prepare() {
    setState("working");
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
      setMessage(data?.existing ? "Connection slot already exists." : "Connection slot prepared. Provider authorization can be completed server-side.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to prepare integration.");
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <button className="button soft" type="button" disabled={state === "working"} onClick={prepare}>
        {state === "working" ? "Preparing…" : state === "ready" ? "Prepared" : "Prepare connection"}
      </button>
      {message && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{message}</p>}
    </div>
  );
}
