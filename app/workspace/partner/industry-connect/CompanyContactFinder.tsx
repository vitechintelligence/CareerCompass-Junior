"use client";

import { useState } from "react";

type Result = {
  email: string | null;
  sourceUrl: string | null;
  contactPage: string | null;
  confidence: "high" | "medium" | "none";
  note: string;
};

export function CompanyContactFinder() {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/vst-junior/company-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, website }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Lookup failed.");
      setResult(payload);
    } catch (error) {
      setResult({
        email: null,
        sourceUrl: null,
        contactPage: null,
        confidence: "none",
        note: error instanceof Error ? error.message : "Lookup failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="panel">
      <div className="eyebrow">Ask Mr. Vi - optional</div>
      <h2 className="workspaceTitle">Find a public company contact</h2>
      <p className="muted">
        Mr. Vi searches public web sources for an official business contact. It will not invent an email or return a private personal address.
      </p>
      <div className="workspaceForm">
        <label><span>Company name</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} maxLength={180} placeholder="Company or employer" /></label>
        <label><span>Known website</span><input value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={500} placeholder="https://company.com" /></label>
        <button className="button soft" type="button" disabled={busy || companyName.trim().length < 2} onClick={search}>
          {busy ? "Mr. Vi is checking..." : "Ask Mr. Vi to find public contact"}
        </button>
      </div>
      {result && (
        <div className="feedbackCard" style={{ marginTop: 14 }}>
          <strong>{result.email || "No verified public email found"}</strong>
          <p className="muted" style={{ margin: "6px 0" }}>{result.note}</p>
          <div className="tagRow"><span className="tag">confidence: {result.confidence}</span></div>
          {result.sourceUrl && <a className="button soft" style={{ marginTop: 10 }} href={result.sourceUrl} target="_blank" rel="noreferrer">Open supporting source</a>}
        </div>
      )}
    </article>
  );
}
