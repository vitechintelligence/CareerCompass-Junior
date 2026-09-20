"use client";

import { useState } from "react";

const capabilityOptions = [
  ["roster_sync", "Roster sync"],
  ["grade_passback", "Grade passback"],
  ["sso", "Single sign-on"],
  ["content_launch", "Content launch"],
  ["resource_sync", "Resource sync"],
  ["assessment_sync", "Assessment sync"],
  ["analytics_export", "Analytics export"],
  ["career_content", "Career / company content"],
  ["simulation_launch", "Simulation launch"],
] as const;

export default function CustomIntegrationRequestForm({ organizationId }: { organizationId: string }) {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);

  function toggle(key: string) {
    setCapabilities((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function submit(formData: FormData) {
    setState("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/integrations/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          providerName: String(formData.get("providerName") || ""),
          providerUrl: String(formData.get("providerUrl") || ""),
          useCase: String(formData.get("useCase") || ""),
          requestedCapabilities: capabilities,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to submit integration request.");
      setState("success");
      setMessage("Request received. ViTech can review the app, choose the safest adapter path and add a provider-specific connector if needed.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit integration request.");
    }
  }

  return (
    <form action={submit} className="workspaceForm">
      <label><span>Third-party app / module name</span><input name="providerName" maxLength={160} required placeholder="Example: School SIS / Lab platform / content app" /></label>
      <label><span>Public product URL</span><input name="providerUrl" maxLength={500} type="url" placeholder="https://…" /></label>
      <label><span>What should it do with Career Compass?</span><textarea name="useCase" maxLength={3000} rows={4} required placeholder="Describe the workflow, data or learning experience you want connected. Do not paste passwords, tokens or secrets." /></label>
      <div>
        <span className="muted" style={{ fontSize: 12 }}>Requested capabilities</span>
        <div className="tagRow" style={{ marginTop: 8 }}>
          {capabilityOptions.map(([key, label]) => (
            <label className="tag" key={key} style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={capabilities.includes(key)} onChange={() => toggle(key)} /> {label}
            </label>
          ))}
        </div>
      </div>
      <button className="button primary" type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sending request…" : "Request a connector"}
      </button>
      {message && <p className="muted" style={{ fontSize: 12 }}>{message}</p>}
    </form>
  );
}
