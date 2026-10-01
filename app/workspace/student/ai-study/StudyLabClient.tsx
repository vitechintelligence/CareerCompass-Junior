"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import DeleteStudySource from "@/app/workspace/privacy/DeleteStudySource";

type Source = { id: string; title: string; source_type: string; original_filename?: string | null; created_at?: string };
type Pack = {
  id: string;
  pack_type: string;
  title: string;
  review_status: string;
  content?: { contentMarkdown?: string } | null;
  grounding_refs?: Array<{ label?: string; locator?: string | null; note?: string | null }>;
  created_at?: string;
};

export default function StudyLabClient({
  organizationId,
  organizationName,
  sources,
  packs,
  ready,
  readinessMessage,
}: {
  organizationId: string;
  organizationName: string;
  sources: Source[];
  packs: Pack[];
  ready: boolean;
  readinessMessage: string;
}) {
  const [sourceId, setSourceId] = useState(sources[0]?.id || "");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [generated, setGenerated] = useState<Record<string, unknown> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chat, setChat] = useState<Array<{ role: "learner" | "vi"; text: string; state?: string }>>([]);
  const [mode, setMode] = useState("ai");

  const selectedSource = useMemo(() => sources.find((source) => source.id === sourceId), [sourceId, sources]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    setBusy("upload");
    setNotice("");
    const form = new FormData(event.currentTarget);
    form.set("organizationId", organizationId);
    const response = await fetch("/api/ai-study/source", { method: "POST", body: form });
    const payload = await response.json();
    if (!response.ok) setNotice(payload.error || "Upload failed.");
    else {
      setNotice(payload.deduplicated ? "That source is already in your library." : "Source uploaded.");
      window.location.reload();
    }
    setBusy("");
  }

  async function generate(packType: "summary" | "study_guide" | "quiz") {
    if (!ready || !sourceId) return;
    setBusy(packType);
    setNotice("");
    setGenerated(null);
    const response = await fetch("/api/ai-study/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, sourceId, packType }),
    });
    const payload = await response.json();
    if (!response.ok) setNotice(payload.error || "Professor Vi could not create that study pack.");
    else {
      setGenerated(payload);
      setNotice(payload.reviewStatus === "pending_review"
        ? "Created. Your school requires teacher review before release."
        : "Created and ready.");
      window.setTimeout(() => window.location.reload(), 900);
    }
    setBusy("");
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") || "").trim();
    if (!message) return;
    setChat((items) => [...items, { role: "learner", text: message }]);
    setBusy("tutor");
    const response = await fetch("/api/ai-study/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, sourceId: sourceId || null, sessionId, lessonMode: mode, message }),
    });
    const payload = await response.json();
    if (!response.ok) setNotice(payload.error || "Professor Vi is unavailable.");
    else {
      setSessionId(payload.sessionId);
      setChat((items) => [...items, { role: "vi", text: payload.message, state: payload.pedagogicalState }]);
      (event.currentTarget.elements.namedItem("message") as HTMLTextAreaElement).value = "";
    }
    setBusy("");
  }

  return (
    <>
      <section className="workspaceIdentity">
        <div>
          <div className="eyebrow">Think Beyond · Professor Vi / Intelligence Instructor</div>
          <h1 className="workspaceHeroTitle">Think first. Build understanding. Improve.</h1>
          <p className="muted">Upload class material, create grounded study aids and quizzes, or work through a question with Professor Vi. School policy controls AI use and answer-release behavior.</p>
        </div>
        <span className="pill">{organizationName}</span>
      </section>

      {!ready && <section className="statusBanner"><strong>Study Lab is not ready for this learner yet.</strong><span>{readinessMessage}</span></section>}
      {notice && <section className="statusBanner"><strong>Study Lab</strong><span>{notice}</span></section>}

      <section className="workspaceGrid">
        <article className="panel">
          <div className="eyebrow">1 · Source library</div>
          <h2 className="workspaceTitle">Add your learning material</h2>
          <p className="muted">Supported by the current school policy: PDF, PowerPoint, Word/text study files. The platform stores source metadata; the AI provider file is temporary and expires under the school retention setting.</p>
          <form className="workspaceForm" onSubmit={upload}>
            <label><span>Title</span><input name="title" maxLength={200} placeholder="e.g. Biology Chapter 3" /></label>
            <label><span>File</span><input name="file" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md" required /></label>
            <label className="communityCheck"><input type="checkbox" name="sourcePermission" required/><span>I have permission to use this material. It contains no other learner&apos;s personal data, identity documents or confidential records. Maximum 3 MiB. / Tôi có quyền sử dụng; không chứa dữ liệu cá nhân học sinh khác, giấy tờ hoặc hồ sơ mật.</span></label>
            <button className="button primary" type="submit" disabled={!ready || busy === "upload"}>{busy === "upload" ? "Uploading…" : "Upload source"}</button>
          </form>
          {sources.length > 0 && <div className="workspaceList" style={{ marginTop: 16 }}>
            {sources.map((source) => <div className="workspaceRow" key={source.id}><div><strong>{source.title}</strong><div className="muted">{source.original_filename || source.source_type}</div><DeleteStudySource organizationId={organizationId} sourceId={source.id}/></div><span className="pill">{source.source_type}</span></div>)}
          </div>}
        </article>

        <article className="panel">
          <div className="eyebrow">2 · Grounded study aids</div>
          <h2 className="workspaceTitle">Create from your source</h2>
          <label><span>Use source</span><select value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
            <option value="">Choose a source</option>
            {sources.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}
          </select></label>
          <div className="actions" style={{ marginTop: 14, flexWrap: "wrap" }}>
            <button className="button" disabled={!ready || !sourceId || Boolean(busy)} onClick={() => generate("summary")}>Summarize</button>
            <button className="button" disabled={!ready || !sourceId || Boolean(busy)} onClick={() => generate("study_guide")}>Build study guide</button>
            <button className="button primary" disabled={!ready || !sourceId || Boolean(busy)} onClick={() => generate("quiz")}>Create custom quiz</button>
          </div>
          {generated && <div className="feedbackCard" style={{ marginTop: 16 }}><strong>{String(generated.title || "Created")}</strong><div className="muted">{String(generated.reviewStatus || "")}</div></div>}
        </article>
      </section>

      <section className="panel">
        <div className="eyebrow">3 · Professor Vi</div>
        <h2 className="workspaceTitle">Work it out with me</h2>
        <p className="muted">Professor Vi follows a guided sequence: ask → reframe → hint → scaffold → explain → reflect → transfer. It should not reveal an answer while productive thinking is still possible.</p>
        <div className="actions" style={{ marginBottom: 12 }}>
          <label><span>Mode</span><select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="ai">General study</option>
            <option value="math_science">Math & Science</option>
            <option value="english">Mastery English</option>
          </select></label>
          <span className="pill">{selectedSource ? "Grounded in " + selectedSource.title : "No source attached"}</span>
        </div>
        <div className="workspaceList">
          {chat.length === 0 && <div className="emptyState"><span>Vi</span><p className="muted">Show me what you are trying to understand. I will help you think through it rather than simply hand you the answer.</p></div>}
          {chat.map((item, index) => <div className="feedbackCard" key={index}><strong>{item.role === "vi" ? "Professor Vi" : "You"}</strong>{item.state && <span className="pill" style={{ marginLeft: 8 }}>{item.state}</span>}<p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p></div>)}
        </div>
        <form className="workspaceForm" onSubmit={ask} style={{ marginTop: 14 }}>
          <label><span>Your question or first attempt</span><textarea name="message" rows={4} maxLength={6000} required placeholder="Explain what you think so far, or ask where you are stuck." /></label>
          <button className="button primary" type="submit" disabled={!ready || busy === "tutor"}>{busy === "tutor" ? "Thinking…" : "Ask Professor Vi"}</button>
        </form>
      </section>

      <section className="panel">
        <div className="eyebrow">My AI learning packs</div>
        <h2 className="workspaceTitle">Generated from your study material</h2>
        {packs.length === 0 ? <div className="emptyState"><span>◎</span><p className="muted">Your summaries, study guides and custom quizzes will appear here.</p></div> : (
          <div className="workspaceList">
            {packs.map((pack) => <div className="feedbackCard" key={pack.id}>
              <div className="workspaceRow" style={{ padding: 0 }}>
                <div><strong>{pack.title}</strong><div className="muted">{pack.pack_type.replace("_", " ")}</div></div>
                <span className="pill">{pack.review_status.replace("_", " ")}</span>
              </div>
              {pack.review_status === "released" && pack.content?.contentMarkdown && <p style={{ whiteSpace: "pre-wrap" }}>{pack.content.contentMarkdown}</p>}
              {pack.review_status === "released" && pack.pack_type === "quiz" && <Link className="button primary" href={"/workspace/student/ai-study/quiz/" + pack.id + "?organizationId=" + encodeURIComponent(organizationId)}>Take quiz</Link>}
              {pack.review_status !== "released" && <p className="muted">Waiting for the institution&apos;s required review before learner release.</p>}
              {Array.isArray(pack.grounding_refs) && pack.grounding_refs.length > 0 && <div className="muted" style={{ marginTop: 8 }}>Source: {pack.grounding_refs.map((ref) => [ref.label, ref.locator].filter(Boolean).join(" · ")).join("; ")}</div>}
            </div>)}
          </div>
        )}
      </section>
    </>
  );
}
