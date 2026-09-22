"use client";

import { useState } from "react";
import { requestCompanyConnection } from "./actions";

const safeguards = [
  "Grade 11–12 only. I will not use this feature for younger learners.",
  "My institution is responsible for the company contact details and information it chooses to disclose, and for required notices/permissions before sharing identifiable learner information.",
  "I understand ViTech is acting as a technology bridge only; an introduction does not create employment, agency, endorsement or partnership with the company.",
  "I understand company simulations are monitored and ViTech may reject, pause or remove unsafe, inappropriate, exploitative or privacy-invasive content.",
];

export default function CompanyConnectionForm({ organizationId }: { organizationId: string }) {
  const [website, setWebsite] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [assistMessage, setAssistMessage] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);

  async function askMrVi() {
    if (!website.trim()) {
      setAssistMessage("Add the company's official website first. Mr. Vi will only use publicly visible business contact information.");
      return;
    }
    setAssistBusy(true);
    setAssistMessage("Scanning the official public website…");
    try {
      const response = await fetch("/api/mr-vi/company-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website }),
      });
      const data = await response.json() as { email?: string; message?: string; sourceUrl?: string };
      if (!response.ok || !data.email) {
        setAssistMessage(data.message || "No public company email was found. Please enter an authorized business contact manually.");
        return;
      }
      setCompanyEmail(data.email);
      setAssistMessage(`Found a public business contact on ${data.sourceUrl || "the official website"}: ${data.email}. Please verify it before sending.`);
    } catch {
      setAssistMessage("Mr. Vi could not complete the public-contact scan. Please enter the company's authorized business email manually.");
    } finally {
      setAssistBusy(false);
    }
  }

  return (
    <form action={requestCompanyConnection} className="workspaceForm">
      <input type="hidden" name="organizationId" value={organizationId} />

      <div className="feedbackCard" style={{ marginBottom: 14 }}>
        <strong>VinaSkillTrust Junior · Grade 11–12 only</strong>
        <p className="muted" style={{ marginBottom: 0 }}>
          This connection layer is for senior-secondary career exposure and age-appropriate simulations. Do not include student names, phone numbers, home addresses or other student personal data in the initial request.
        </p>
      </div>

      <label><span>Company name</span><input name="companyName" maxLength={180} required placeholder="Company or employer" /></label>
      <label><span>Official website</span><input name="companyWebsite" maxLength={500} type="url" placeholder="https://company.com" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>

      <div className="workspaceForm" style={{ gap: 8 }}>
        <label><span>Public company / authorized business email</span><input name="companyEmail" maxLength={254} type="email" required placeholder="partnerships@company.com" value={companyEmail} onChange={(event) => setCompanyEmail(event.target.value)} /></label>
        <button className="button soft" type="button" onClick={askMrVi} disabled={assistBusy}>{assistBusy ? "Mr. Vi is checking…" : "Ask Mr. Vi · Find public contact"}</button>
        {assistMessage && <p className="muted" style={{ fontSize: 12, margin: 0 }}>{assistMessage}</p>}
      </div>

      <label><span>Contact person (optional)</span><input name="contactName" maxLength={120} placeholder="Partnerships / HR / CSR contact" /></label>
      <label><span>Sector</span><input name="sector" maxLength={120} placeholder="Technology / Manufacturing / Healthcare / Finance…" /></label>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Eligible cohort</legend>
        <div className="tagRow">
          <label className="tag"><input type="checkbox" name="grades" value="11" /> Grade 11</label>
          <label className="tag"><input type="checkbox" name="grades" value="12" /> Grade 12</label>
        </div>
      </fieldset>

      <div><span className="muted" style={{ fontSize: 12 }}>What connection would be useful?</span><div className="tagRow" style={{ marginTop: 8 }}>
        <label className="tag"><input type="checkbox" name="collaborationTypes" value="career_talk" /> Career talk</label>
        <label className="tag"><input type="checkbox" name="collaborationTypes" value="role_profiles" /> Role profiles</label>
        <label className="tag"><input type="checkbox" name="collaborationTypes" value="skills_briefing" /> Skills briefing</label>
        <label className="tag"><input type="checkbox" name="collaborationTypes" value="work_simulation" /> Work simulation</label>
        <label className="tag"><input type="checkbox" name="collaborationTypes" value="project_brief" /> Student project brief</label>
        <label className="tag"><input type="checkbox" name="collaborationTypes" value="mentoring" /> Mentoring</label>
        <label className="tag"><input type="checkbox" name="collaborationTypes" value="site_visit" /> Site visit</label>
      </div></div>

      <label><span>Message to the company</span><textarea name="note" rows={5} maxLength={3000} placeholder="Explain what you want Grade 11–12 students to learn. Do not include student personal data." /></label>

      <details className="feedbackCard" open>
        <summary><strong>Terms of Use + Privacy acknowledgement</strong></summary>
        <div className="workspaceForm" style={{ marginTop: 12 }}>
          {safeguards.map((copy, index) => (
            <label className="tag" style={{ alignItems: "flex-start", whiteSpace: "normal" }} key={copy}>
              <input type="checkbox" name={index === 0 ? "agreeGrades" : index === 1 ? "agreeSchoolResponsibility" : index === 2 ? "agreeBridgeRole" : "agreeModeration"} value="yes" required />
              <span>{copy}</span>
            </label>
          ))}
          <label className="tag" style={{ alignItems: "flex-start", whiteSpace: "normal" }}>
            <input type="checkbox" name="agreeTerms" value="yes" required />
            <span>I am authorized by the institution and accept the current VinaSkillTrust Junior Terms of Use and Privacy Notice for this request.</span>
          </label>
        </div>
      </details>

      <button className="button primary" type="submit">Send monitored company invitation</button>
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>The company receives the institution request only. No student profile data is sent. Any simulation proposal remains unpublished until ViTech moderation.</p>
    </form>
  );
}
