"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CurriculumActivity } from "@/lib/curriculum";

type Props = {
  activity: CurriculumActivity;
  locale: "en" | "vi";
  bookCode: string;
  unitCode: string;
  enrollmentId: string | null;
};

export default function GenericActivity({ activity, locale, bookCode, unitCode, enrollmentId }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "local">("idle");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const title = locale === "vi" ? activity.titleVi : activity.titleEn;
  const instructions = locale === "vi" ? activity.instructionsVi : activity.instructionsEn;
  const content = activity.content || {};
  const items = Array.isArray(content.items) ? content.items : [];
  const options = Array.isArray(content.options) ? content.options.map(String) : [];
  const sequence = Array.isArray(content.sequence) ? content.sequence.map(String) : [];
  const pairs = Array.isArray(content.pairs) ? content.pairs as Array<Record<string, unknown>> : [];
  const answer = typeof content.answer === "string" ? content.answer : null;
  const model = typeof content.model === "string" ? content.model : null;
  const prompt = typeof content.prompt === "string" ? content.prompt : null;
  const type = activity.activityType.toLowerCase();
  const voicePractice = type.includes("speaking") || Boolean(model);

  const selectedSequence = useMemo(() => ordered.length > 0 ? ordered : [], [ordered]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [audioUrl]);

  function speak(value: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  async function startRecording() {
    setRecorderError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecorderError(locale === "vi" ? "Trình duyệt này chưa hỗ trợ ghi âm trực tiếp." : "This browser does not support in-page audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRecording(true);
    } catch {
      setRecorderError(locale === "vi"
        ? "Không thể truy cập micro. Em vẫn có thể tiếp tục bài mà không cần ghi âm."
        : "Microphone access was unavailable. You can continue without recording.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setRecording(false);
  }

  async function syncAttempt(completed: boolean, score: number, response: Record<string, unknown>) {
    setSyncState("saving");
    try {
      const res = await fetch("/api/learning/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          bookCode,
          unitCode,
          activityCode: activity.code,
          locale,
          completed,
          score,
          response,
          enrollmentId: enrollmentId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSyncState("saved");
        return;
      }
      setSyncState("local");
      if (res.status === 403) {
        setMessage(locale === "vi"
          ? "Không thể ghi tiến độ vào hồ sơ khác. Hãy mở sách từ Cổng học sinh của chính em."
          : "Progress cannot be written to another learner profile. Open the book from your own Student Workspace.");
        return;
      }
      if (data?.localOnly) return;
    } catch {
      setSyncState("local");
    }
  }

  async function checkChoice() {
    if (!selected) {
      setMessage(locale === "vi" ? "Hãy chọn một đáp án trước." : "Choose an answer first.");
      return;
    }
    const correct = answer ? selected === answer : true;
    setMessage(answer ? (correct ? (locale === "vi" ? "Đúng rồi!" : "Correct!") : (locale === "vi" ? "Thử lại nhé." : "Try again.")) : (locale === "vi" ? "Đã lưu lựa chọn." : "Choice saved."));
    await syncAttempt(correct || !answer, correct ? 1 : 0, { selected, correct: answer ? correct : undefined });
  }

  async function saveOpenResponse() {
    if (!text.trim()) {
      setMessage(locale === "vi" ? "Hãy nhập câu trả lời trước." : "Add your response first.");
      return;
    }
    setMessage(locale === "vi" ? "Đã hoàn thành hoạt động." : "Activity completed.");
    await syncAttempt(true, 1, { text: text.trim() });
  }

  async function saveSequence() {
    if (selectedSequence.length !== sequence.length) {
      setMessage(locale === "vi" ? "Hãy chọn đủ các bước." : "Choose every step first.");
      return;
    }
    const expected = Array.isArray(content.answerSequence) ? content.answerSequence.map(String) : sequence;
    const correct = expected.every((value, index) => selectedSequence[index] === value);
    setMessage(correct ? (locale === "vi" ? "Thứ tự chính xác!" : "Great sequence!") : (locale === "vi" ? "Gần đúng rồi. Hãy thử sắp xếp lại." : "Almost there. Try a different order."));
    await syncAttempt(correct, correct ? 1 : 0, { sequence: selectedSequence, correct });
  }

  function chooseSequence(value: string) {
    setOrdered((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  return (
    <article className="lessonCard genericActivityCard">
      <div className="lessonSectionHeader">
        <div><div className="lessonSectionLabel">{activity.code} · {activity.activityType.replaceAll("_", " ")}</div><h3>{title}</h3></div>
        <div className="tagRow">
          {activity.evidenceEligible && <span className="pill">Evidence eligible</span>}
          {syncState === "saving" && <span className="pill">{locale === "vi" ? "Đang lưu…" : "Saving…"}</span>}
          {syncState === "saved" && <span className="pill">{locale === "vi" ? "Đã đồng bộ hồ sơ" : "Profile synced"}</span>}
          {syncState === "local" && <span className="pill">{locale === "vi" ? "Chưa đồng bộ" : "Not synced"}</span>}
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

      {voicePractice && (
        <div className="voiceLabCard" style={{ marginTop: 16, padding: 16, borderRadius: 16 }}>
          <div className="lessonSectionLabel">{locale === "vi" ? "Phòng luyện giọng riêng tư" : "Private voice practice"}</div>
          <h4 style={{ margin: "6px 0 8px" }}>{locale === "vi" ? "Nghe mẫu → ghi âm → nghe lại → thử lại" : "Listen → record → replay → retry"}</h4>
          <p className="muted" style={{ marginTop: 0 }}>
            {locale === "vi"
              ? "Bản ghi chỉ tồn tại tạm thời trong trình duyệt và không được tải lên hồ sơ hay máy chủ."
              : "Your recording stays temporarily in this browser and is not uploaded to your profile or server."}
          </p>
          <div className="voiceActions">
            {!recording ? (
              <button className="button soft" onClick={startRecording} type="button">🎙️ {locale === "vi" ? "Bắt đầu ghi" : "Start recording"}</button>
            ) : (
              <button className="button primary" onClick={stopRecording} type="button">■ {locale === "vi" ? "Dừng ghi" : "Stop recording"}</button>
            )}
            {audioUrl && <audio controls src={audioUrl} className="voicePlayback" />}
          </div>
          {recorderError && <p className="activityMessage">{recorderError}</p>}
        </div>
      )}

      {options.length > 0 && <div className="choiceGrid">{options.map((option) => <button className={`choiceButton ${selected === option ? "selected" : ""}`} type="button" key={option} onClick={() => setSelected(option)}>{option}</button>)}</div>}

      {sequence.length > 0 && <div>
        <div className="choiceGrid">{sequence.map((value) => <button className={`choiceButton ${selectedSequence.includes(value) ? "selected" : ""}`} type="button" key={value} onClick={() => chooseSequence(value)}>{selectedSequence.includes(value) ? `${selectedSequence.indexOf(value) + 1}. ` : ""}{value}</button>)}</div>
        <div className="activityFooter"><button className="button soft" type="button" onClick={saveSequence}>{locale === "vi" ? "Kiểm tra thứ tự" : "Check order"}</button></div>
      </div>}

      {(type.includes("reflection") || type.includes("writing") || type.includes("short_answer") || type.includes("speaking") || type.includes("journal")) && (
        <div>
          {type.includes("speaking") && <p className="muted">{locale === "vi" ? "Nói câu trả lời thành tiếng, nghe lại giọng của em, sau đó viết từ khóa hoặc câu bên dưới." : "Say your answer aloud, replay your voice, then capture your key words or sentence below."}</p>}
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={locale === "vi" ? "Viết câu trả lời của em…" : "Write your response…"} style={{ width: "100%", minHeight: 120, padding: 14, borderRadius: 14, border: "1px solid #cbd5e1", font: "inherit" }} />
          <div className="activityFooter"><button className="button soft" type="button" onClick={saveOpenResponse}>{locale === "vi" ? "Lưu hoàn thành" : "Save completion"}</button></div>
        </div>
      )}

      {options.length > 0 && <div className="activityFooter"><button className="button soft" type="button" onClick={checkChoice}>{locale === "vi" ? "Kiểm tra" : "Check"}</button></div>}
      {options.length === 0 && sequence.length === 0 && !type.includes("reflection") && !type.includes("writing") && !type.includes("short_answer") && !type.includes("speaking") && !type.includes("journal") && (type === "self_check" || items.length > 0 || model) && (
        <div className="activityFooter"><button className="button soft" type="button" onClick={() => syncAttempt(true, 1, { viewed: true })}>{locale === "vi" ? "Đánh dấu hoàn thành" : "Mark complete"}</button></div>
      )}
      {message && <p className="activityMessage">{message}</p>}
    </article>
  );
}
