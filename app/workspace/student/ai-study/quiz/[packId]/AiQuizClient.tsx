"use client";

import { useEffect, useMemo, useState } from "react";

type Option = { id: string; label: string };
type Activity = {
  id: string;
  launch: {
    activity: {
      contentVersion: number;
      learningObjective: { en?: string | null; vi?: string | null };
      content: { prompt?: string; options?: Option[] };
    };
  };
};

export default function AiQuizClient({ organizationId, packId }: { organizationId: string; packId: string }) {
  const [title, setTitle] = useState("Professor Vi Quiz");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { outcome?: string; evidenceLevel?: string }>>({});
  const [status, setStatus] = useState("Loading quiz…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-study/quiz/" + encodeURIComponent(packId) + "?organizationId=" + encodeURIComponent(organizationId), { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "quiz_unavailable");
        if (!cancelled) {
          setTitle(String(payload.pack?.title || "Professor Vi Quiz"));
          setActivities(Array.isArray(payload.activities) ? payload.activities : []);
          setStatus("");
        }
      })
      .catch((error) => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Quiz unavailable.");
      });
    return () => { cancelled = true; };
  }, [organizationId, packId]);

  const complete = useMemo(
    () => activities.length > 0 && activities.every((activity) => Boolean(answers[activity.id])),
    [activities, answers],
  );

  async function submit() {
    if (!complete || busy) return;
    setBusy(true);
    setStatus("");
    const payloadAnswers = activities.map((activity) => ({
      activityId: activity.id,
      selectedAnswerId: answers[activity.id],
      submissionId: crypto.randomUUID(),
    }));
    const response = await fetch("/api/ai-study/quiz/" + encodeURIComponent(packId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, answers: payloadAnswers }),
    });
    const payload = await response.json();
    if (!response.ok) setStatus(payload.error || "Quiz submission failed.");
    else {
      const next: Record<string, { outcome?: string; evidenceLevel?: string }> = {};
      for (const row of Array.isArray(payload.results) ? payload.results : []) {
        next[String(row.activityId)] = {
          outcome: String(row.evaluation?.outcome || ""),
          evidenceLevel: String(row.evidenceLevel || ""),
        };
      }
      setResults(next);
      setStatus("Saved. Correct objective answers are DEMONSTRATED; incorrect attempts remain PRACTICED.");
    }
    setBusy(false);
  }

  return (
    <>
      <section className="workspaceIdentity">
        <div>
          <div className="eyebrow">Professor Vi · Custom Quiz</div>
          <h1 className="workspaceHeroTitle">{title}</h1>
          <p className="muted">These questions were generated from your released study source and use the same versioned Activity Contract/evidence semantics as the rest of Career Compass Junior.</p>
        </div>
        <span className="pill">{activities.length} questions</span>
      </section>

      {status && <section className="statusBanner"><strong>Quiz</strong><span>{status}</span></section>}

      <section className="workspaceList">
        {activities.map((activity, index) => {
          const content = activity.launch.activity.content || {};
          const options = Array.isArray(content.options) ? content.options : [];
          const result = results[activity.id];
          return (
            <article className="panel" key={activity.id}>
              <div className="eyebrow">Question {index + 1}</div>
              <h2 className="workspaceTitle">{String(content.prompt || "Choose the best answer.")}</h2>
              <div className="workspaceList">
                {options.map((option) => (
                  <label className="communityCheck" key={option.id}>
                    <input
                      type="radio"
                      name={activity.id}
                      value={option.id}
                      checked={answers[activity.id] === option.id}
                      disabled={Boolean(result)}
                      onChange={() => setAnswers((current) => ({ ...current, [activity.id]: option.id }))}
                    />
                    <span><strong>{option.id}.</strong> {option.label}</span>
                  </label>
                ))}
              </div>
              {result && <div className="statusBanner" style={{ marginTop: 12 }}>
                <strong>{result.outcome === "correct" ? "Criterion met" : "Keep practicing"}</strong>
                <span>{result.evidenceLevel}</span>
              </div>}
            </article>
          );
        })}
      </section>

      {activities.length > 0 && Object.keys(results).length === 0 && (
        <section className="panel">
          <button className="button primary" disabled={!complete || busy} onClick={submit}>
            {busy ? "Saving…" : "Submit quiz"}
          </button>
        </section>
      )}
    </>
  );
}
