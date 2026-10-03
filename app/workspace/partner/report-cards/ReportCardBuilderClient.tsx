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
        <label><span>How do you want to start?</span><select name="startMode" defaultValue="country_template"><option value="country_template">Country starting template</option><option value="school_import">Migrate my school&apos;s existing form</option><option value="ai_builder">AI Builder from my answers</option><option value="vitech_template">ViTech neutral template</option><option value="blank">Blank</option><option value="remix">Remix a starting template</option></select></label>
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
        <p className="muted">Use a blank approved form only, up to 3 MiB. File conversion requires a connected, approved intelligence runtime and is currently unavailable in production. Built-in and blank rule-based templates remain available. Completed report cards, student names, grades, photographs and signatures must not be uploaded here.</p>
        <label className="communityCheck"><input type="checkbox" name="noPersonalData" required /><span>I confirm these requirements and any file contain no learner personal data. / Tôi xác nhận nội dung và tệp không chứa dữ liệu cá nhân học sinh.</span></label>
        <button className="button primary" type="submit" disabled={busy}>Build report-card draft</button>
      </section>

      <section hidden={step !== 4}>
        <h3>Generated draft</h3>
        {!preview && <p className="muted">Complete the questions and build a draft first.</p>}
        {preview && <>
          <div className="statusBanner"><strong>{preview.title || "Report card"}</strong><span>{generationMode === "ai" ? "AI-assisted draft" : "Rule-based draft"} · school approval still required</span></div>
          <p className="muted">{preview.sourceNote}</p>
          <TemplatePreview preview={preview} />
        </>}
      </section>

      {status && <div className="statusBanner"><strong>Builder</strong><span>{status}</span></div>}
    </form>
  );
}


function TemplatePreview({ preview }: { preview: Preview }) {
  return (
    <div style={{ overflowX: "auto", padding: 12 }}>
      <article
        aria-label="Printable report-card preview"
        style={{
          width: "min(794px, 100%)",
          margin: "0 auto",
          padding: "36px 32px",
          background: "white",
          color: "#111",
          border: "1px solid #bbb",
          minHeight: 900,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>School / Trường</div>
          <h2 style={{ margin: "16px 0 6px", fontSize: 24 }}>{preview.title || "REPORT CARD / HỌC BẠ"}</h2>
          <div style={{ fontSize: 13 }}>Academic year / Năm học: ....................................</div>
        </header>

        {(preview.sections || []).map((section, sectionIndex) => (
          <section key={section.key || sectionIndex} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, textTransform: "uppercase", borderBottom: "1.5px solid #111", paddingBottom: 5, marginBottom: 10 }}>
              {section.title || "Section"}
            </h3>
            {(section.fields || []).map((field, fieldIndex) => {
              if (field.type === "table") {
                const columns = Array.isArray((field as { columns?: Array<{ key?: string; label?: string }> }).columns)
                  ? (field as { columns: Array<{ key?: string; label?: string }> }).columns
                  : [];
                return (
                  <div key={field.key || fieldIndex} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 5 }}>{field.label}</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead><tr>{columns.map((column, index) => <th key={column.key || index} style={{ border: "1px solid #555", padding: 6, textAlign: "center" }}>{column.label || "Column"}</th>)}</tr></thead>
                      <tbody>{[0,1,2].map((row) => <tr key={row}>{columns.map((column, index) => <td key={(column.key || index) + "-" + row} style={{ border: "1px solid #777", padding: 10 }}>&nbsp;</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                );
              }
              if (field.type === "signature") {
                return (
                  <div key={field.key || fieldIndex} style={{ display: "inline-block", width: "48%", verticalAlign: "top", textAlign: "center", minHeight: 90, paddingTop: 10 }}>
                    <strong style={{ fontSize: 12 }}>{field.label}</strong>
                    <div style={{ marginTop: 44, borderBottom: "1px dotted #555" }} />
                  </div>
                );
              }
              return (
                <div key={field.key || fieldIndex} style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8, alignItems: "end", margin: "8px 0", fontSize: 12 }}>
                  <strong>{field.label}</strong>
                  <span style={{ borderBottom: "1px dotted #555", minHeight: 18 }} />
                </div>
              );
            })}
          </section>
        ))}

        <footer style={{ marginTop: 24, fontSize: 10, lineHeight: 1.4 }}>
          Draft preview only. The institution must approve the grading policy and active report-card template before official use.
        </footer>
      </article>
    </div>
  );
}
