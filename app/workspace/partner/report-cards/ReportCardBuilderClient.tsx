"use client";

import { FormEvent, useState } from "react";

type Preview = {
  title?: string;
  sourceNote?: string;
  sections?: Array<{ key?: string; title?: string; fields?: Array<{ key?: string; label?: string; type?: string }> }>;
};

export default function ReportCardBuilderClient({ organizationId }: { organizationId: string }) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [generationMode, setGenerationMode] = useState("");

  async function build(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("organizationId", organizationId);
    setBusy(true);
    setStatus("Building your school-owned draft…");
    try {
      const response = await fetch("/api/report-cards/build", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Builder failed");
      setPreview(data.schema || null);
      setGenerationMode(String(data.generationMode || ""));
      setStatus("Draft generated. Review it below; a school administrator must still activate it.");
      setStep(4);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Builder failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="workspaceForm" onSubmit={build}>
      <input type="hidden" name="organizationId" value={organizationId} />

      <div className="miniGrid">
        <button type="button" className={"miniCard light " + (step === 1 ? "communityOptionActive" : "")} onClick={() => setStep(1)}><strong>1 · Foundation</strong><span>Country, level, starting point</span></button>
        <button type="button" className={"miniCard light " + (step === 2 ? "communityOptionActive" : "")} onClick={() => setStep(2)}><strong>2 · Scoring & content</strong><span>Periods, subjects, scale</span></button>
        <button type="button" className={"miniCard light " + (step === 3 ? "communityOptionActive" : "")} onClick={() => setStep(3)}><strong>3 · Print & approval</strong><span>Languages, signatures, upload</span></button>
        <button type="button" className={"miniCard light " + (step === 4 ? "communityOptionActive" : "")} onClick={() => setStep(4)}><strong>4 · Preview</strong><span>Review generated draft</span></button>
      </div>

      <section hidden={step !== 1}>
        <h3>What are we building for?</h3>
        <label><span>Country / regulatory framework</span><select name="countryCode" defaultValue="VN"><option value="VN">Vietnam</option><option value="PH">Philippines</option><option value="MY">Malaysia</option><option value="SG">Singapore</option><option value="TH">Thailand</option><option value="ID">Indonesia</option><option value="CUSTOM">Other / custom</option></select></label>
        <label><span>Education level</span><select name="educationLevel" defaultValue="lower_secondary"><option value="primary">Primary</option><option value="lower_secondary">Lower secondary</option><option value="upper_secondary">Upper secondary</option><option value="custom">Custom / mixed</option></select></label>
        <label><span>How do you want to start?</span><select name="startMode" defaultValue="country_template"><option value="country_template">Country starting template</option><option value="school_import">Migrate my school's existing form</option><option value="ai_builder">AI Builder from my answers</option><option value="vitech_template">ViTech neutral template</option><option value="blank">Blank</option><option value="remix">Remix a starting template</option></select></label>
        <label><span>School name</span><input name="schoolName" maxLength={200} /></label>
        <label><span>Report title (optional)</span><input name="title" maxLength={200} /></label>
        <button className="button" type="button" onClick={() => setStep(2)}>Continue →</button>
      </section>

      <section hidden={step !== 2}>
        <h3>What does your school actually grade/report?</h3>
        <label><span>Academic periods (one per line)</span><textarea name="academicPeriods" rows={4} defaultValue={"Học kỳ I\nHọc kỳ II\nCả năm"} /></label>
        <label><span>Grading scale / descriptors</span><textarea name="gradingScale" rows={5} placeholder="Example only: scores, achievement levels, letter grades, descriptors. Enter what your school follows." /></label>
        <label><span>Subjects / learning areas (one per line)</span><textarea name="subjects" rows={7} placeholder={"Mathematics\nLiterature\nEnglish\nScience"} /></label>
        <label className="communityCheck"><input type="checkbox" name="includeConduct" value="true" /><span>Include conduct/training/behavior section</span></label>
        <label className="communityCheck"><input type="checkbox" name="includeCompetencies" value="true" /><span>Include competencies / qualities / skills section</span></label>
        <button className="button" type="button" onClick={() => setStep(3)}>Continue →</button>
      </section>

      <section hidden={step !== 3}>
        <h3>What must the printed form preserve?</h3>
        <fieldset><legend>Languages</legend><label className="communityCheck"><input type="checkbox" name="languages" value="vi" defaultChecked /><span>Vietnamese</span></label><label className="communityCheck"><input type="checkbox" name="languages" value="en" /><span>English</span></label></fieldset>
        <label><span>Required signatures/approvals (one per line)</span><textarea name="requiredSignatures" rows={4} defaultValue={"Giáo viên chủ nhiệm\nHiệu trưởng"} /></label>
        <label><span>Print requirements</span><textarea name="printNotes" rows={4} placeholder="A4, portrait/landscape, logo/seal, photo, page numbering…" /></label>
        <label><span>Anything else the builder must not miss?</span><textarea name="additionalRequirements" rows={5} placeholder="State school or government requirements here. The builder will not invent them." /></label>
        <label><span>Existing school report-card file (optional)</span><input name="schoolTemplate" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md" /></label>
        <p className="muted">For migration mode, upload the school's current approved form. The builder uses it as the primary visual/field reference; the original file is not stored by this workflow.</p>
        <button className="button primary" type="submit" disabled={busy}>Build report-card draft</button>
      </section>

      <section hidden={step !== 4}>
        <h3>Generated draft</h3>
        {!preview && <p className="muted">Complete the questions and build a draft first.</p>}
        {preview && <>
          <div className="statusBanner"><strong>{preview.title || "Report card"}</strong><span>{generationMode === "ai" ? "AI-assisted draft" : "Rule-based draft"} · school approval still required</span></div>
          <p className="muted">{preview.sourceNote}</p>
          <div className="workspaceList">
            {(preview.sections || []).map((section, index) => <article className="feedbackCard" key={section.key || index}><strong>{section.title || "Section"}</strong><div className="muted">{(section.fields || []).map((field) => field.label).filter(Boolean).join(" · ")}</div></article>)}
          </div>
        </>}
      </section>

      {status && <div className="statusBanner"><strong>Builder</strong><span>{status}</span></div>}
    </form>
  );
}
