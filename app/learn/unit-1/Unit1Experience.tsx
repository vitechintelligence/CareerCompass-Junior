"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { unit1Lessons, unit1Meta, type LessonActivity, type UnitLocale } from "@/lib/unit1";
import { practiceStorageKey } from "@/lib/learning/progress-policy";
import {
  createCompatibleMediaRecorder,
  microphoneErrorMessage,
  stopStream,
} from "@/lib/device/media-recorder";

type Props = {
  locale: UnitLocale;
  enrollmentId?: string;
  storageNamespace: string;
};

function sameOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export default function Unit1Experience({ locale, enrollmentId, storageNamespace }: Props) {
  const [activeId, setActiveId] = useState(1);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [reflection, setReflection] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [age, setAge] = useState(8);
  const [sequence, setSequence] = useState<string[]>([]);
  const [pairLeft, setPairLeft] = useState("");
  const [pairRight, setPairRight] = useState("");
  const [colorAnswers, setColorAnswers] = useState<Record<string, string>>({});
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<number, string>>({});
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const lesson = useMemo(
    () => unit1Lessons.find((item) => item.id === activeId) ?? unit1Lessons[0],
    [activeId],
  );

  const progressPercent = Math.round((completedIds.length / unit1Lessons.length) * 100);
  const isComplete = completedIds.includes(lesson.id);
  const otherLocale: UnitLocale = locale === "en" ? "vi" : "en";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(practiceStorageKey(storageNamespace, "completed"));
        if (stored) {
          const parsed = JSON.parse(stored) as number[];
          if (Array.isArray(parsed)) setCompletedIds(parsed.filter((value) => Number.isInteger(value)));
        }
      } catch {
        // Local progress is optional. A blocked localStorage should never block the lesson.
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [storageNamespace]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMessage(null);
      setSelected(null);
      setSequence([]);
      setPairLeft("");
      setPairRight("");
      setColorAnswers({});
      setCheckpointAnswers({});
      setRecorderError(null);

      try {
        setReflection(window.localStorage.getItem(practiceStorageKey(storageNamespace, "reflection", activeId)) ?? "");
      } catch {
        setReflection("");
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeId, storageNamespace]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      stopStream(streamRef.current);
    };
  }, [audioUrl]);

  useEffect(() => {
    const stopForPageHide = () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch { stopStream(streamRef.current); }
      } else {
        stopStream(streamRef.current);
      }
    };
    window.addEventListener("pagehide", stopForPageHide);
    return () => window.removeEventListener("pagehide", stopForPageHide);
  }, []);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.84;
    window.speechSynthesis.speak(utterance);
  }

  function persistCompleted(next: number[]) {
    setCompletedIds(next);
    try {
      window.localStorage.setItem(practiceStorageKey(storageNamespace, "completed"), JSON.stringify(next));
    } catch {
      // Completion remains usable in this session even if storage is blocked.
    }
  }

  function markComplete() {
    if (!completedIds.includes(lesson.id)) {
      persistCompleted([...completedIds, lesson.id].sort((a, b) => a - b));
    }
    setMessage(
      locale === "vi"
        ? "Em đã tự ghi nhận bài luyện tập trên thiết bị này. Đây chưa phải minh chứng đã nắm vững."
        : "Practice self-reported on this device. This does not demonstrate mastery.",
    );
  }

  function saveReflection(value: string) {
    setReflection(value);
    try {
      window.localStorage.setItem(practiceStorageKey(storageNamespace, "reflection", lesson.id), value);
    } catch {
      // Reflection remains visible for the current session.
    }
  }

  function checkActivity(activity: LessonActivity) {
    let correct = false;

    switch (activity.type) {
      case "choice":
        correct = selected === activity.answer;
        break;
      case "age":
        correct = age >= 7 && age <= 12;
        break;
      case "sequence":
        correct = sameOrder(sequence, activity.answer);
        break;
      case "build":
        correct = sameOrder(sequence, activity.answer);
        break;
      case "color":
        correct = activity.items.every((item) => colorAnswers[item.label] === item.color);
        break;
      case "pair":
        correct = Boolean(pairLeft && pairRight);
        break;
      case "checkpoint":
        correct = activity.questions.every(
          (question, index) => checkpointAnswers[index] === question.answer,
        );
        break;
    }

    if (correct) {
      markComplete();
      return;
    }

    setMessage(
      locale === "vi"
        ? "Chưa đúng hoàn toàn. Em thử lại nhé — không bị trừ điểm."
        : "Not quite yet. Try again — there is no penalty for retrying.",
    );
  }

  async function startRecording() {
    setRecorderError(null);
    if (!window.isSecureContext) {
      setRecorderError(
        locale === "vi"
          ? "Ghi âm cần kết nối HTTPS an toàn."
          : "Recording requires a secure HTTPS connection.",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecorderError(
        locale === "vi"
          ? "Trình duyệt này chưa hỗ trợ ghi âm trực tiếp."
          : "This browser does not support in-page audio recording.",
      );
      return;
    }

    try {
      stopStream(streamRef.current);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = createCompatibleMediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = (event) => {
        setRecorderError(microphoneErrorMessage(event, locale));
        setRecording(false);
        stopStream(stream);
        streamRef.current = null;
      };

      recorder.onstop = () => {
        const blobChunk = chunksRef.current.find((chunk): chunk is Blob => chunk instanceof Blob && Boolean(chunk.type));
        const mimeType = recorder.mimeType || blobChunk?.type || "audio/mp4";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (blob.size > 0) {
          setAudioUrl(URL.createObjectURL(blob));
        } else {
          setRecorderError(
            locale === "vi"
              ? "Không nhận được âm thanh. Hãy kiểm tra micro và thử lại."
              : "No audio was captured. Check the microphone and retry.",
          );
        }
        setRecording(false);
        stopStream(stream);
        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      for (const track of stream.getAudioTracks()) {
        track.onended = () => {
          if (recorder.state !== "inactive") {
            try { recorder.stop(); } catch { stopStream(stream); }
          }
          setRecorderError(
            locale === "vi"
              ? "Phiên ghi âm đã bị hệ thống hoặc thiết bị ngắt. Hãy thử lại."
              : "Recording was interrupted by the device or browser. Please retry.",
          );
          setRecording(false);
        };
      }

      recorder.start();
      setRecording(true);
    } catch (error) {
      stopStream(streamRef.current);
      streamRef.current = null;
      mediaRecorderRef.current = null;
      setRecording(false);
      setRecorderError(microphoneErrorMessage(error, locale));
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { stopStream(streamRef.current); }
    } else {
      stopStream(streamRef.current);
      streamRef.current = null;
      setRecording(false);
    }
  }

  function selectSequenceItem(item: string) {
    if (!sequence.includes(item)) setSequence([...sequence, item]);
  }

  function goToLesson(nextId: number) {
    const bounded = Math.min(unit1Lessons.length, Math.max(1, nextId));
    setActiveId(bounded);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="lessonApp">
      <header className="topbar lessonTopbar">
        <Link className="brand" href="/">
          <span className="brandMark">CC</span>
          <span>Career Compass Junior</span>
        </Link>
        <div className="lessonHeaderActions">
          <Link className="pill" href={`/portal/student?lang=${locale}`}>
            {locale === "vi" ? "Cổng học sinh" : "Student Portal"}
          </Link>
          <Link className="pill" href={`/learn/unit-1?lang=${otherLocale}${enrollmentId ? `&enrollmentId=${encodeURIComponent(enrollmentId)}` : ""}`}>
            {locale === "en" ? "Tiếng Việt" : "English"}
          </Link>
        </div>
      </header>

      <div className="lessonShell">
        <aside className="lessonSidebar">
          <div className="eyebrow">{unit1Meta.code}</div>
          <h2 className="lessonUnitTitle">
            {locale === "vi" ? unit1Meta.viTitle : unit1Meta.title}
          </h2>
          <p className="muted lessonSmallCopy">
            {locale === "vi"
              ? "4 tuần · 8 bài học tương tác · dấu luyện tập theo hồ sơ học"
              : "4 weeks · 8 interactive lessons · enrollment-scoped practice markers"}
          </p>
          <div className="lessonProgressLabel">
            <strong>{progressPercent}%</strong>
            <span>{locale === "vi" ? "tự ghi nhận luyện tập" : "practice self-reported"}</span>
          </div>
          <div className="progressTrack">
            <div className="progressFill" style={{ width: `${progressPercent}%` }} />
          </div>

          <nav className="lessonNav" aria-label="Unit 1 lessons">
            {unit1Lessons.map((item) => (
              <button
                className={`lessonNavItem ${item.id === lesson.id ? "active" : ""}`}
                key={item.id}
                onClick={() => goToLesson(item.id)}
                type="button"
              >
                <span className="lessonNavNumber">{completedIds.includes(item.id) ? "✓" : item.id}</span>
                <span>
                  <strong>{locale === "vi" ? item.viTitle : item.title}</strong>
                  <small>{locale === "vi" ? `Tuần ${item.week}` : `Week ${item.week}`}</small>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="lessonStage">
          <div className="lessonHeroCard">
            <div>
              <div className="eyebrow">
                {locale === "vi" ? `Bài ${lesson.id} · Tuần ${lesson.week}` : `Lesson ${lesson.id} · Week ${lesson.week}`}
              </div>
              <h1 className="lessonTitle">{locale === "vi" ? lesson.viTitle : lesson.title}</h1>
              <p className="lessonViSub">{locale === "vi" ? lesson.title : lesson.viTitle}</p>
            </div>
            <div className={`lessonStatus ${isComplete ? "done" : ""}`}>
              {isComplete
                ? locale === "vi" ? "✓ Tự ghi nhận đã luyện tập" : "✓ Practice self-reported"
                : locale === "vi" ? "Đang học" : "In progress"}
            </div>
          </div>

          <div className="lessonGrid twoCol">
            <article className="lessonCard canDoCard">
              <div className="lessonSectionLabel">{locale === "vi" ? "Mục tiêu" : "I can"}</div>
              <h3>{lesson.canDo}</h3>
              <p className="muted">{locale === "vi" ? "Nói chậm, thử nhiều lần và dùng mẫu khi cần." : "Go slowly, retry freely, and use the model whenever you need it."}</p>
            </article>
            <article className="lessonCard missionCard">
              <div className="lessonSectionLabel">{locale === "vi" ? "Nhiệm vụ" : "Mission"}</div>
              <h3>{lesson.mission}</h3>
              <div className="tagRow">
                {lesson.practice.map((item) => <span className="tag" key={item}>{item}</span>)}
              </div>
            </article>
          </div>

          <article className="lessonCard">
            <div className="lessonSectionHeader">
              <div>
                <div className="lessonSectionLabel">Look · Listen · Say</div>
                <h3>{locale === "vi" ? "Từ vựng trọng tâm" : "Focus vocabulary"}</h3>
              </div>
              <span className="pill">🎧 {locale === "vi" ? "Bấm để nghe" : "Tap to hear"}</span>
            </div>
            <div className="vocabGrid">
              {lesson.vocab.map((item) => (
                <button className="vocabCard" key={item.en} onClick={() => speak(item.en)} type="button">
                  <span className="vocabSpeaker" aria-hidden="true">🔊</span>
                  <strong>{item.en}</strong>
                  <span>{item.vi}</span>
                </button>
              ))}
            </div>
          </article>

          <div className="lessonGrid twoCol">
            <article className="lessonCard">
              <div className="lessonSectionLabel">{locale === "vi" ? "Mẫu nói" : "Speaking model"}</div>
              <div className="modelLines">
                {lesson.model.map((line) => (
                  <button className="modelLine" key={line} onClick={() => speak(line)} type="button">
                    <span>🔊</span><strong>{line}</strong>
                  </button>
                ))}
              </div>
            </article>
            <article className="lessonCard rhythmCard">
              <div className="lessonSectionLabel">{locale === "vi" ? "Âm & nhịp" : "Sound & rhythm"}</div>
              <div className="rhythmText">{lesson.rhythm}</div>
              <button className="button soft" onClick={() => speak(lesson.rhythm.replaceAll("/", " "))} type="button">
                {locale === "vi" ? "Nghe mẫu" : "Hear the rhythm"}
              </button>
            </article>
          </div>

          <article className="lessonCard activityCard">
            <div className="lessonSectionHeader">
              <div>
                <div className="lessonSectionLabel">{locale === "vi" ? "Thử thách tương tác" : "Interactive challenge"}</div>
                <h3>{lesson.activity.prompt}</h3>
              </div>
              <span className="pill">🧩 {locale === "vi" ? "Thử lại thoải mái" : "Retry freely"}</span>
            </div>

            <ActivityBody
              activity={lesson.activity}
              age={age}
              checkpointAnswers={checkpointAnswers}
              colorAnswers={colorAnswers}
              pairLeft={pairLeft}
              pairRight={pairRight}
              selected={selected}
              sequence={sequence}
              setAge={setAge}
              setCheckpointAnswers={setCheckpointAnswers}
              setColorAnswers={setColorAnswers}
              setPairLeft={setPairLeft}
              setPairRight={setPairRight}
              setSelected={setSelected}
              selectSequenceItem={selectSequenceItem}
              resetSequence={() => setSequence([])}
            />

            <div className="activityFooter">
              <button className="button primary" onClick={() => checkActivity(lesson.activity)} type="button">
                {locale === "vi" ? "Kiểm tra & lưu tiến độ" : "Check & save progress"}
              </button>
              {message && <p className={`activityMessage ${isComplete ? "success" : ""}`}>{message}</p>}
            </div>
          </article>

          <div className="lessonGrid twoCol">
            <article className="lessonCard voiceLabCard">
              <div className="lessonSectionLabel">{locale === "vi" ? "Phòng luyện nói riêng tư" : "Private speaking lab"}</div>
              <h3>{locale === "vi" ? "Ghi âm → nghe lại → thử lại" : "Record → replay → retry"}</h3>
              <p className="muted">
                {locale === "vi"
                  ? "Âm thanh chỉ tồn tại tạm thời trong trình duyệt. Bản thử nghiệm không tải bản ghi lên máy chủ."
                  : "Audio exists only temporarily in your browser. This preview never uploads the recording to a server."}
              </p>
              <div className="voiceActions">
                {!recording ? (
                  <button className="button soft" onClick={startRecording} type="button" aria-pressed="false" aria-describedby="voice-lab-status">🎙️ {locale === "vi" ? "Bắt đầu ghi" : "Start recording"}</button>
                ) : (
                  <button className="button primary" onClick={stopRecording} type="button" aria-pressed="true" aria-describedby="voice-lab-status">■ {locale === "vi" ? "Dừng ghi" : "Stop recording"}</button>
                )}
                {audioUrl && <audio controls preload="metadata" src={audioUrl} className="voicePlayback" aria-label={locale === "vi" ? "Nghe lại bản ghi" : "Replay your recording"} />}
              </div>
              <p id="voice-lab-status" className="muted lessonSmallCopy" role="status" aria-live="polite">
                {recording
                  ? (locale === "vi" ? "Đang ghi âm. Bấm Dừng ghi khi hoàn tất." : "Recording. Press Stop recording when finished.")
                  : (locale === "vi" ? "Bản ghi chỉ ở trên thiết bị và không được tải lên máy chủ." : "Your recording stays on this device and is not uploaded.")}
              </p>
              {recorderError && <p className="activityMessage" role="alert">{recorderError}</p>}
            </article>

            <article className="lessonCard reflectionCard">
              <div className="lessonSectionLabel">{locale === "vi" ? "Suy ngẫm" : "Reflection"}</div>
              <h3>{lesson.reflection}</h3>
              <textarea
                aria-label="Lesson reflection"
                onChange={(event) => saveReflection(event.target.value)}
                placeholder={locale === "vi" ? "Viết một câu ngắn…" : "Write one short sentence…"}
                rows={5}
                value={reflection}
              />
              <p className="muted lessonSmallCopy">
                {locale === "vi" ? "Lưu cục bộ trên thiết bị trong bản thử nghiệm." : "Stored locally on this device in the preview."}
              </p>
            </article>
          </div>

          <div className="lessonBottomNav">
            <button className="button" disabled={lesson.id === 1} onClick={() => goToLesson(lesson.id - 1)} type="button">
              ← {locale === "vi" ? "Bài trước" : "Previous lesson"}
            </button>
            <button className="button primary" disabled={lesson.id === unit1Lessons.length} onClick={() => goToLesson(lesson.id + 1)} type="button">
              {locale === "vi" ? "Bài tiếp" : "Next lesson"} →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

type ActivityBodyProps = {
  activity: LessonActivity;
  selected: string | null;
  age: number;
  sequence: string[];
  pairLeft: string;
  pairRight: string;
  colorAnswers: Record<string, string>;
  checkpointAnswers: Record<number, string>;
  setSelected: (value: string) => void;
  setAge: (value: number) => void;
  selectSequenceItem: (value: string) => void;
  resetSequence: () => void;
  setPairLeft: (value: string) => void;
  setPairRight: (value: string) => void;
  setColorAnswers: (value: Record<string, string>) => void;
  setCheckpointAnswers: (value: Record<number, string>) => void;
};

function ActivityBody(props: ActivityBodyProps) {
  const { activity } = props;

  if (activity.type === "choice") {
    return (
      <div className="choiceGrid">
        {activity.options.map((option) => (
          <button className={`choiceButton ${props.selected === option ? "selected" : ""}`} key={option} onClick={() => props.setSelected(option)} type="button">
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (activity.type === "age") {
    return (
      <div className="ageBuilder">
        <label>
          <span>Age</span>
          <select value={props.age} onChange={(event) => props.setAge(Number(event.target.value))}>
            {[7, 8, 9, 10, 11, 12].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <div className="sentencePreview">I&apos;m <strong>{props.age}</strong> years old.</div>
      </div>
    );
  }

  if (activity.type === "sequence" || activity.type === "build") {
    const items = activity.type === "sequence" ? activity.items : activity.pieces;
    return (
      <div className="sequenceBuilder">
        <div className="sequenceTray">
          {props.sequence.length === 0 ? <span className="muted">Tap the pieces in the correct order.</span> : props.sequence.map((item, index) => <span className="sequenceToken" key={`${item}-${index}`}>{item}</span>)}
        </div>
        <div className="choiceGrid compact">
          {items.map((item) => (
            <button className="choiceButton" disabled={props.sequence.includes(item)} key={item} onClick={() => props.selectSequenceItem(item)} type="button">{item}</button>
          ))}
        </div>
        <button className="textButton" onClick={props.resetSequence} type="button">Reset order</button>
      </div>
    );
  }

  if (activity.type === "color") {
    const colors = ["red", "blue", "green", "yellow"];
    return (
      <div className="colorMatchGrid">
        {activity.items.map((item) => (
          <label className="colorMatchRow" key={item.label}>
            <strong>{item.label}</strong>
            <select
              value={props.colorAnswers[item.label] ?? ""}
              onChange={(event) => props.setColorAnswers({ ...props.colorAnswers, [item.label]: event.target.value })}
            >
              <option value="">Choose color</option>
              {colors.map((color) => <option key={color} value={color}>{color}</option>)}
            </select>
          </label>
        ))}
      </div>
    );
  }

  if (activity.type === "pair") {
    return (
      <div className="pairBuilder">
        <label>
          <span>{activity.leftLabel}</span>
          <select value={props.pairLeft} onChange={(event) => props.setPairLeft(event.target.value)}>
            <option value="">Choose…</option>
            {activity.leftOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>{activity.rightLabel}</span>
          <select value={props.pairRight} onChange={(event) => props.setPairRight(event.target.value)}>
            <option value="">Choose…</option>
            {activity.rightOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        {props.pairLeft && props.pairRight && <div className="sentencePreview">I&apos;m <strong>{props.pairLeft}</strong>. I like <strong>{props.pairRight}</strong>.</div>}
      </div>
    );
  }

  return (
    <div className="checkpointList">
      {activity.questions.map((question, index) => (
        <div className="checkpointQuestion" key={question.q}>
          <strong>{index + 1}. {question.q}</strong>
          <div className="choiceGrid compact">
            {question.options.map((option) => (
              <button
                className={`choiceButton ${props.checkpointAnswers[index] === option ? "selected" : ""}`}
                key={option}
                onClick={() => props.setCheckpointAnswers({ ...props.checkpointAnswers, [index]: option })}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
