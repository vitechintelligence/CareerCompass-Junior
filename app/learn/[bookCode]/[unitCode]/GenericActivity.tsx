"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { reuseOrCreateSubmission, type PendingSubmission } from "@/lib/learning/idempotency";
import type { CurriculumActivity } from "@/lib/curriculum";

type Props = {
  activity: CurriculumActivity;
  locale: "en" | "vi";
  bookCode: string;
  unitCode: string;
  enrollmentId?: string;
};

export default function GenericActivity({ activity, locale, bookCode, unitCode, enrollmentId }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [resolvedEnrollmentId, setResolvedEnrollmentId] = useState(enrollmentId);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const pendingSubmissionRef = useRef<PendingSubmission | null>(null);
  const [syncState, setSyncState] = useState<"checking" | "idle" | "saving" | "synced" | "failed">(
    enrollmentId ? "checking" : "idle",
  );
  const title = locale === "vi" ? activity.titleVi : activity.titleEn;
  const instructions = locale === "vi" ? activity.instructionsVi : activity.instructionsEn;
  const content = activity.content || {};
  const items = Array.isArray(content.items) ? content.items : [];
  const options = Array.isArray(content.options) ? content.options.map(String) : [];
  const sequence = Array.isArray(content.sequence) ? content.sequence.map(String) : [];
  const pairs = Array.isArray(content.pairs) ? content.pairs as Array<Record<string, unknown>> : [];
  const model = typeof content.model === "string" ? content.model : null;
  const prompt = typeof content.prompt === "string" ? content.prompt : null;
  const type = activity.activityType.toLowerCase();

  const selectedSequence = useMemo(() => ordered.length > 0 ? ordered : [], [ordered]);

  useEffect(() => {
    if (!resolvedEnrollmentId) return;
    let cancelled = false;

    async function hydrate() {
      setSyncState("checking");
      try {
        const params = new URLSearchParams({
          bookCode,
          unitCode,
          enrollmentId: resolvedEnrollmentId as string,
        });
        const response = await fetch(`/api/learning/progress?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setSyncState("failed");
          setMessage(locale === "vi" ? "Không thể tải tiến độ đã lưu." : "Could not load saved progress.");
          return;
        }
        const saved = Array.isArray(data?.activities)
          ? data.activities.find((item: { activityCode?: string }) => item?.activityCode === activity.code)
          : null;
        if (saved && Number(saved.contentVersion) !== activity.contentVersion) {
          setSyncState("failed");
          setMessage(locale === "vi" ? "Nội dung đã được cập nhật. Hãy tải lại bài học." : "This activity was updated. Reload the lesson.");
          return;
        }
        setAttemptCount(Number(saved?.attemptCount || 0));
        setLastSavedAt(typeof saved?.lastSavedAt === "string" ? saved.lastSavedAt : null);
        setSyncState(Number(saved?.attemptCount || 0) > 0 ? "synced" : "idle");
      } catch {
        if (!cancelled) {
          setSyncState("failed");
          setMessage(locale === "vi" ? "Không thể tải tiến độ đã lưu." : "Could not load saved progress.");
        }
      }
    }

    void hydrate();
    return () => { cancelled = true; };
  }, [activity.code, activity.contentVersion, bookCode, locale, resolvedEnrollmentId, unitCode]);

  function speak(value: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  async function syncAttempt(response: Record<string, unknown>) {
    if (syncState === "saving") return;
    const signature = JSON.stringify(response);
    let pending: PendingSubmission;
    try {
      pending = reuseOrCreateSubmission(
        pendingSubmissionRef.current,
        signature,
        () => crypto.randomUUID(),
      );
      pendingSubmissionRef.current = pending;
    } catch {
      setMessage(locale === "vi" ? "Không thể tạo mã gửi bài an toàn." : "Could not create a safe submission ID.");
      setSyncState("failed");
      return;
    }

    setSyncState("saving");
    try {
      const res = await fetch("/api/learning/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookCode,
          unitCode,
          activityCode: activity.code,
          contentVersion: activity.contentVersion,
          submissionId: pending.submissionId,
          enrollmentId: resolvedEnrollmentId,
          locale,
          response,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.evaluation?.feedback) {
        if (typeof data?.enrollmentId === "string") setResolvedEnrollmentId(data.enrollmentId);
        setAttemptCount(Number(data?.attemptCount || data?.attemptNumber || attemptCount + 1));
        setLastSavedAt(new Date().toISOString());
        setMessage(data.evaluation.feedback[locale]);
        pendingSubmissionRef.current = null;
        setSyncState("synced");
        return;
      }
      setMessage(data?.error === "missing_or_invalid_answer_key"
        ? (locale === "vi" ? "Hoạt động thiếu đáp án được xác minh. Hãy báo cho giáo viên." : "This activity needs a verified answer key. Ask your teacher.")
        : (locale === "vi" ? "Chưa lưu được. Vui lòng thử lại." : "Save failed. Please retry."));
      setSyncState("failed");
    } catch {
      setMessage(locale === "vi" ? "Chưa lưu được. Vui lòng thử lại." : "Save failed. Please retry.");
      setSyncState("failed");
    }
  }

  async function checkChoice() {
    if (!selected) {
      setMessage(locale === "vi" ? "Hãy chọn một đáp án trước." : "Choose an answer first.");
      return;
    }
    await syncAttempt({ selected });
  }

  async function saveOpenResponse() {
    if (!text.trim()) {
      setMessage(locale === "vi" ? "Hãy nhập câu trả lời trước." : "Add your response first.");
      return;
    }
    await syncAttempt({ text: text.trim() });
  }

  async function saveSequence() {
    if (selectedSequence.length !== sequence.length) {
      setMessage(locale === "vi" ? "Hãy chọn đủ các bước." : "Choose every step first.");
      return;
    }
    await syncAttempt({ sequence: selectedSequence });
  }

  function chooseSequence(value: string) {
    setMessage(null);
    setOrdered((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  return (
    <article className="lessonCard genericActivityCard">
      <div className="lessonSectionHeader">
        <div><div className="lessonSectionLabel">{activity.code} · {activity.activityType.replaceAll("_", " ")}</div><h3>{title}</h3></div>
        <div className="tagRow">
          {activity.evidenceEligible && <span className="pill">{locale === "vi" ? "Có thể xét minh chứng" : "Eligible for review"}</span>}
          {syncState === "checking" && <span className="pill">{locale === "vi" ? "Đang tải tiến độ…" : "Loading saved progress…"}</span>}
          {syncState === "saving" && <span className="pill">{locale === "vi" ? "Đang lưu…" : "Saving…"}</span>}
          {syncState === "synced" && <span className="pill">{locale === "vi" ? `Đã lưu · ${attemptCount} lần` : `Saved · ${attemptCount} attempt${attemptCount === 1 ? "" : "s"}`}</span>}
          {syncState === "failed" && <span className="pill">{locale === "vi" ? "Chưa lưu / chưa tải được — thử lại" : "Not saved / could not load — retry"}</span>}
        </div>
      </div>
      {instructions && <p className="muted">{instructions}</p>}
      {prompt && <p><strong>{prompt}</strong></p>}

      {model && <button className="modelLine" type="button" onClick={() => speak(model)}><span>🔊</span><strong>{model}</strong></button>}

      {items.length > 0 && <div className="vocabGrid">{items.map((raw, index) => {
        const item = raw as Record<string, unknown>;
        const word = String(item.word || item.en || item.label || `Item ${index + 1}`);
        const vi = item.vi ? String(item.vi) : "";
        const example = item.example ? String(item.example) : "";
        return <button className="vocabCard" type="button" key={`${word}-${index}`} onClick={() => speak(word)}><span className="vocabSpeaker">🔊</span><strong>{word}</strong>{vi && <span>{vi}</span>}{example && <small>{example}</small>}</button>;
      })}</div>}

      {pairs.length > 0 && <div className="workspaceList">{pairs.map((pair, index) => {
        const left = String(pair.left ?? pair.en ?? pair.word ?? `Item ${index + 1}`);
        const right = String(pair.right ?? pair.vi ?? pair.meaning ?? "");
        return <div className="workspaceRow" key={`${left}-${index}`}><button className="pill" type="button" onClick={() => speak(left)}>🔊 {left}</button><strong>{right}</strong></div>;
      })}</div>}

      {options.length > 0 && <div className="choiceGrid">{options.map((option) => <button className={`choiceButton ${selected === option ? "selected" : ""}`} type="button" key={option} onClick={() => { setSelected(option); setMessage(null); }}>{option}</button>)}</div>}

      {sequence.length > 0 && <div>
        <div className="choiceGrid">{sequence.map((value) => <button className={`choiceButton ${selectedSequence.includes(value) ? "selected" : ""}`} type="button" key={value} onClick={() => chooseSequence(value)}>{selectedSequence.includes(value) ? `${selectedSequence.indexOf(value) + 1}. ` : ""}{value}</button>)}</div>
        <div className="activityFooter"><button className="button soft" type="button" disabled={syncState === "saving"} onClick={saveSequence}>{locale === "vi" ? "Kiểm tra thứ tự" : "Check order"}</button></div>
      </div>}

      {(type.includes("reflection") || type.includes("writing") || type.includes("short_answer") || type.includes("speaking") || type.includes("journal")) && (
        <div>
          {type.includes("speaking") && <p className="muted">{locale === "vi" ? "Nói câu trả lời thành tiếng, sau đó viết từ khóa hoặc câu của em bên dưới." : "Say your answer aloud, then capture your key words or sentence below."}</p>}
          <textarea value={text} onChange={(event) => { setText(event.target.value); setMessage(null); }} placeholder={locale === "vi" ? "Viết câu trả lời của em…" : "Write your response…"} style={{ width: "100%", minHeight: 120, padding: 14, borderRadius: 14, border: "1px solid #cbd5e1", font: "inherit" }} />
          <div className="activityFooter"><button className="button soft" type="button" onClick={saveOpenResponse} disabled={syncState === "saving"}>{locale === "vi" ? "Ghi nhận luyện tập" : "Record practice"}</button></div>
        </div>
      )}

      {options.length > 0 && <div className="activityFooter"><button className="button soft" type="button" onClick={checkChoice} disabled={syncState === "saving"}>{locale === "vi" ? "Kiểm tra" : "Check"}</button></div>}
      {options.length === 0 && sequence.length === 0 && !type.includes("reflection") && !type.includes("writing") && !type.includes("short_answer") && !type.includes("speaking") && !type.includes("journal") && (type === "self_check" || items.length > 0 || model) && (
        <div className="activityFooter"><button className="button soft" type="button" disabled={syncState === "saving"} onClick={() => syncAttempt({ selfReported: true })}>{locale === "vi" ? "Tự ghi nhận đã luyện tập" : "Self-report practice"}</button></div>
      )}
      {message && <p className="activityMessage">{message}</p>}
      {lastSavedAt && syncState === "synced" && <p className="muted" style={{ fontSize: 11 }}>
        {locale === "vi" ? "Bản ghi máy chủ gần nhất: " : "Latest server save: "}
        {new Date(lastSavedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-GB")}
      </p>}
    </article>
  );
}
