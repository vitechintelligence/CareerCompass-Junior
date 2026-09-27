"use client";

import { useState } from "react";

export default function LtiRegistrationForm({
  organizationId,
  installationId,
  providerName,
}: {
  organizationId: string;
  installationId: string;
  providerName: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save(formData: FormData) {
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/integrations/lti/registrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          installationId,
          platformName: String(formData.get("platformName") || ""),
          issuer: String(formData.get("issuer") || ""),
          clientId: String(formData.get("clientId") || ""),
          deploymentId: String(formData.get("deploymentId") || ""),
          authLoginUrl: String(formData.get("authLoginUrl") || ""),
          authTokenUrl: String(formData.get("authTokenUrl") || ""),
          jwksUrl: String(formData.get("jwksUrl") || ""),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to save LTI registration.");
      setState("saved");
      setMessage("LTI platform registration saved. Complete the LMS-side tool registration, then perform a sandbox launch before marking this connection live.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to save LTI registration.");
    }
  }

  return (
    <div className="feedbackCard" style={{ marginTop: 14 }}>
      <div className="eyebrow">LTI 1.3 platform registration</div>
      <h4 style={{ margin: "6px 0 8px" }}>{providerName}</h4>
      <p className="muted" style={{ fontSize: 12 }}>
        Copy these values from the LMS LTI 1.3 / LTI Advantage configuration. Do not paste passwords or private keys.
      </p>

      <div className="statusBanner">
        <strong>Canvas shortcut</strong>
        <span>Use <code>/api/lti/config/canvas</code> as the Canvas JSON configuration URL. Career Compass publishes its public key at <code>/api/lti/.well-known/jwks.json</code>.</span>
      </div>

      <form action={save} className="workspaceForm" style={{ marginTop: 12 }}>
        <label><span>Platform name</span><input name="platformName" required maxLength={160} defaultValue={providerName} placeholder="School Canvas / School Moodle" /></label>
        <label><span>Platform ID / Issuer</span><input name="issuer" type="url" required maxLength={1000} placeholder="https://…" /></label>
        <label><span>Client ID</span><input name="clientId" required maxLength={500} autoComplete="off" /></label>
        <label><span>Deployment ID</span><input name="deploymentId" required maxLength={500} autoComplete="off" /></label>
        <label><span>Authentication request / OIDC authorization URL</span><input name="authLoginUrl" type="url" required maxLength={2000} placeholder="https://…" /></label>
        <label><span>Access token URL</span><input name="authTokenUrl" type="url" required maxLength={2000} placeholder="https://…" /></label>
        <label><span>Platform public keyset / JWKS URL</span><input name="jwksUrl" type="url" required maxLength={2000} placeholder="https://…" /></label>
        <button className="button primary" type="submit" disabled={state === "saving"}>
          {state === "saving" ? "Saving LTI registration…" : "Save LTI registration"}
        </button>
      </form>
      {message && <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>{message}</p>}
    </div>
  );
}
