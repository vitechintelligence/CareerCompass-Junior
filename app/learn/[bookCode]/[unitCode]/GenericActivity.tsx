"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { reuseOrCreateSubmission, type PendingSubmission } from "@/lib/learning/idempotency";
import {
  enqueueLearningWrite,
  readLearningOutbox,
  removeLearningWrite,
  responseIsSafeForOfflineQueue,
} from "@/lib/learning/offline-outbox";
import type { CurriculumActivity } from "@/lib/curriculum";

type Props = {
  activity: CurriculumActivity;
  locale: "en" | "vi";
  bookCode: string;
  unitCode: string;
  enrollmentId?: string;
  ageBand?: string | null;
  offlineOutboxEnabled?: boolean;
};

export default function GenericActivity({ activity, locale, bookCode, unitCode, enrollmentId, ageBand, offlineOutboxEnabled = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [matchAnswers, setMatchAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [resolvedEnrollmentId, setResolvedEnrollmentId] = useState(enrollmentId);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const pendingSubmissionRef = useRef<PendingSubmission | null>(null);
  const [syncState, setSyncState] = useState<"checking" | "idle" | "saving" | "queued" | "synced" | "failed">(
    enrollmentId ? "checking" : "idle",
  );
  const title = locale === "vi" ? activity.titleVi : activity.titleEn;
  const instructions = locale === "vi" ? activity.instructionsVi : activity.instructionsEn;
  const content = activity.content || {};
  const items = Array.isArray(content.items) ? content.items : [];
  const options = Array.isArray(content.options) ? content.options.map(String) : [];
  const sequence = Array.isArray(content.sequence) ? content.sequence.map(String) : [];
  const matching = content.matching && typeof content.matching === "object" && !Array.isArray(content.matching)
    ? content.matching as Record<string, unknown>
    : {};
  const matchingLeft = Array.isArray(matching.left) ? matching.left.map(String) : [];
  const matchingRight = Array.isArray(matching.right) ? matching.right.map(String) : [];
  const model = typeof content.model === "string" ? content.model : null;
  const prompt = typeof content.prompt === "string" ? content.prompt : null;
  const type = activity.activityType.toLowerCase();
  const ageMatch = String(ageBand || "").replace(/[–—]/g, "-").match(/^(\d{1,2})-(\d{1,2})$/);
  const earlyYears = Boolean(ageMatch && Number(ageMatch[2]) <= 6);
  const openResponseType =
    type.includes("reflection") ||
    type.includes("writing") ||
    type.includes("short_answer") ||
    type.includes("journal") ||
    (type.includes("speaking") && !earlyYears);

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

  useEffect(() => {
    if (!resolvedEnrollmentId || !offlineOutboxEnabled) return;
    let cancelled = false;

    async function flushOutbox() {
      if (!navigator.onLine) return;
      const queued = readLearningOutbox(resolvedEnrollmentId as string);
      if (queued.length === 0) return;

      let flushed = 0;
      for (const item of queued) {
        try {
          const response = await fetch(item.url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(item.body),
          });
          if (response.ok) {
            removeLearningWrite(resolvedEnrollmentId as string, item.id);
            flushed += 1;
            continue;
          }
          if ([401, 403, 409, 422].includes(response.status)) break;
          if (response.status >= 500) break;
        } catch {
          break;
        }
      }

      if (!cancelled && flushed > 0) {
        const remaining = readLearningOutbox(resolvedEnrollmentId as string);
        setSyncState(remaining.length > 0 ? "queued" : "synced");
        setMessage(remaining.length > 0
          ? (locale === "vi" ? "Một số bài đang chờ đồng bộ lại." : "Some attempts are still waiting to sync.")
          : (locale === "vi" ? "Các bài chờ đã đồng bộ với máy chủ." : "Queued attempts synced to the server."));
      }
    }

    const onOnline = () => { void flushOutbox(); };
    if (navigator.onLine) void flushOutbox();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [locale, offlineOutboxEnabled, resolvedEnrollmentId]);

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

    const requestBody = {
      bookCode,
      unitCode,
      activityCode: activity.code,
      contentVersion: activity.contentVersion,
      submissionId: pending.submissionId,
      enrollmentId: resolvedEnrollmentId,
      locale,
      response,
    };

    setSyncState("saving");
    try {
      const res = await fetch("/api/learning/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
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
      if (
        offlineOutboxEnabled &&
        resolvedEnrollmentId &&
        (res.status >= 500 || !navigator.onLine) &&
        responseIsSafeForOfflineQueue(response) &&
        enqueueLearningWrite(resolvedEnrollmentId, {
          id: pending.submissionId,
          url: "/api/learning/attempt",
          body: requestBody,
        })
      ) {
        pendingSubmissionRef.current = null;
        setMessage(locale === "vi"
          ? "Đã xếp hàng trên thiết bị. Bài chưa được lưu trên máy chủ và sẽ thử đồng bộ khi có mạng."
          : "Queued on this device. It is not server-saved yet and will retry when online.");
        setSyncState("queued");
        return;
      }

      setMessage(data?.error === "missing_or_invalid_answer_key"
        ? (locale === "vi" ? "Hoạt động thiếu đáp án được xác minh. Hãy báo cho giáo viên." : "This activity needs a verified answer key. Ask your teacher.")
        : (locale === "vi" ? "Chưa lưu được. Vui lòng thử lại." : "Save failed. Please retry."));
      setSyncState("failed");
    } catch {
      if (
        offlineOutboxEnabled &&
        resolvedEnrollmentId &&
        responseIsSafeForOfflineQueue(response) &&
        enqueueLearningWrite(resolvedEnrollmentId, {
          id: pending.submissionId,
          url: "/api/learning/attempt",
          body: requestBody,
        })
      ) {
        pendingSubmissionRef.current = null;
        setMessage(locale === "vi"
          ? "Đã xếp hàng trên thiết bị. Bài chưa được lưu trên máy chủ và sẽ thử đồng bộ khi có mạng."
          : "Queued on this device. It is not server-saved yet and will retry when online.");
        setSyncState("queued");
        return;
      }
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

  async function saveMatching() {
    if (
      matchingLeft.length < 2 ||
      matchingRight.length !== matchingLeft.length ||
      matchingLeft.some((left) => !matchAnswers[left]) ||
      new Set(matchingLeft.map((left) => matchAnswers[left])).size !== matchingLeft.length
    ) {
      setMessage(locale === "vi" ? "Hãy ghép mỗi mục với một đáp án khác nhau." : "Match every item to a different answer.");
      return;
    }
    await syncAttempt({
      matches: matchingLeft.map((left) => ({ left, right: matchAnswers[left] })),
    });
  }

  return (
    <article className={`lessonCard genericActivityCard${earlyYears ? " earlyYearsActivity" : ""}`}>
      <div className="lessonSectionHeader">
        <div><div className="lessonSectionLabel">{activity.code} · {activity.activityType.replaceAll("_", " ")}</div><h3>{title}</h3></div>
        <div className="tagRow">
          {activity.evidenceEligible && <span className="pill">{locale === "vi" ? "Có thể xét minh chứng" : "Eligible for review"}</span>}
          {syncState === "checking" && <span className="pill">{locale === "vi" ? "Đang tải tiến độ…" : "Loading saved progress…"}</span>}
          {syncState === "saving" && <span className="pill">{locale === "vi" ? "Đang lưu…" : "Saving…"}</span>}
          {syncState === "queued" && <span className="pill">{locale === "vi" ? "Đang chờ mạng · chưa lưu máy chủ" : "Queued offline · not server-saved"}</span>}
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

      {matchingLeft.length > 0 && matchingRight.length === matchingLeft.length && <div className="workspaceList">
        {matchingLeft.map((left, index) => {
          const chosenElsewhere = new Set(
            matchingLeft.filter((item) => item !== left).map((item) => matchAnswers[item]).filter(Boolean),
          );
          return <label className="workspaceRow" key={`${left}-${index}`}>
            <button className="pill" type="button" onClick={() => speak(left)} aria-label={`Hear ${left}`}>🔊 {left}</button>
            <select
              aria-label={`Match ${left}`}
              value={matchAnswers[left] || ""}
              onChange={(event) => {
                setMatchAnswers((current) => ({ ...current, [left]: event.target.value }));
                setMessage(null);
              }}
            >
              <option value="">{locale === "vi" ? "Chọn đáp án…" : "Choose match…"}</option>
              {matchingRight.map((right) => <option key={right} value={right} disabled={chosenElsewhere.has(right)}>{right}</option>)}
            </select>
          </label>;
        })}
        <div className="activityFooter"><button className="button soft" type="button" disabled={syncState === "saving"} onClick={saveMatching}>{locale === "vi" ? "Kiểm tra ghép đôi" : "Check matches"}</button></div>
      </div>}

      {options.length > 0 && <div className="choiceGrid">{options.map((option) => <button className={`choiceButton ${selected === option ? "selected" : ""}`} type="button" key={option} onClick={() => { setSelected(option); setMessage(null); }}>{option}</button>)}</div>}

      {sequence.length > 0 && <div>
        <div className="choiceGrid">{sequence.map((value) => <button className={`choiceButton ${selectedSequence.includes(value) ? "selected" : ""}`} type="button" key={value} onClick={() => chooseSequence(value)}>{selectedSequence.includes(value) ? `${selectedSequence.indexOf(value) + 1}. ` : ""}{value}</button>)}</div>
        <div className="activityFooter"><button className="button soft" type="button" disabled={syncState === "saving"} onClick={saveSequence}>{locale === "vi" ? "Kiểm tra thứ tự" : "Check order"}</button></div>
      </div>}

      {openResponseType && (
        <div>
          {type.includes("speaking") && <p className="muted">{locale === "vi" ? "Nói câu trả lời thành tiếng, sau đó viết từ khóa hoặc câu của em bên dưới." : "Say your answer aloud, then capture your key words or sentence below."}</p>}
          <textarea value={text} onChange={(event) => { setText(event.target.value); setMessage(null); }} placeholder={locale === "vi" ? "Viết câu trả lời của em…" : "Write your response…"} style={{ width: "100%", minHeight: 120, padding: 14, borderRadius: 14, border: "1px solid #cbd5e1", font: "inherit" }} />
          <div className="activityFooter"><button className="button soft" type="button" onClick={saveOpenResponse} disabled={syncState === "saving"}>{locale === "vi" ? "Ghi nhận luyện tập" : "Record practice"}</button></div>
        </div>
      )}

      {options.length > 0 && <div className="activityFooter"><button className="button soft" type="button" onClick={checkChoice} disabled={syncState === "saving"}>{locale === "vi" ? "Kiểm tra" : "Check"}</button></div>}
      {earlyYears && type.includes("speaking") && (
        <div className="activityFooter">
          <button className="button primary" type="button" disabled={syncState === "saving"} onClick={() => syncAttempt({ selfReported: true, mode: "voice_practice" })}>
            {locale === "vi" ? "🎤 Em đã nói và luyện tập" : "🎤 I said it and practiced"}
          </button>
          <p className="muted">{locale === "vi" ? "Đây là dấu luyện tập, chưa phải minh chứng đã thành thạo." : "This records practice only; it does not prove mastery."}</p>
        </div>
      )}
      {options.length === 0 && sequence.length === 0 && matchingLeft.length === 0 && !openResponseType && !(earlyYears && type.includes("speaking")) && (type === "self_check" || items.length > 0 || model) && (
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
