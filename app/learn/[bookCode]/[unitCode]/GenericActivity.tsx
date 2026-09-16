"use client";

import { useState } from "react";
import type { CurriculumActivity } from "@/lib/curriculum";

export default function GenericActivity({ activity, locale }: { activity: CurriculumActivity; locale: "en" | "vi" }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const title = locale === "vi" ? activity.titleVi : activity.titleEn;
  const instructions = locale === "vi" ? activity.instructionsVi : activity.instructionsEn;
  const content = activity.content || {};
  const items = Array.isArray(content.items) ? content.items : [];
  const options = Array.isArray(content.options) ? content.options.map(String) : [];
  const answer = typeof content.answer === "string" ? content.answer : null;
  const model = typeof content.model === "string" ? content.model : null;

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  function check() {
    if (!answer) {
      setMessage(locale === "vi" ? "Hoạt động này sẵn sàng cho nội dung tương tác tiếp theo." : "This activity is ready for its next interactive content payload.");
      return;
    }
    setMessage(selected === answer ? (locale === "vi" ? "Đúng rồi!" : "Correct!") : (locale === "vi" ? "Thử lại nhé." : "Try again."));
  }

  return (
    <article className="lessonCard genericActivityCard">
      <div className="lessonSectionHeader">
        <div><div className="lessonSectionLabel">{activity.code} · {activity.activityType.replaceAll("_", " ")}</div><h3>{title}</h3></div>
        {activity.evidenceEligible && <span className="pill">Evidence eligible</span>}
      </div>
      {instructions && <p className="muted">{instructions}</p>}

      {model && <button className="modelLine" type="button" onClick={() => speak(model)}><span>🔊</span><strong>{model}</strong></button>}

      {items.length > 0 && <div className="vocabGrid">{items.map((raw, index) => {
        const item = raw as Record<string, unknown>;
        const word = String(item.word || item.en || item.label || `Item ${index + 1}`);
        const vi = item.vi ? String(item.vi) : "";
        return <button className="vocabCard" type="button" key={`${word}-${index}`} onClick={() => speak(word)}><span className="vocabSpeaker">🔊</span><strong>{word}</strong>{vi && <span>{vi}</span>}</button>;
      })}</div>}

      {options.length > 0 && <div className="choiceGrid">{options.map((option) => <button className={`choiceButton ${selected === option ? "selected" : ""}`} type="button" key={option} onClick={() => setSelected(option)}>{option}</button>)}</div>}
      {(options.length > 0 || activity.activityType === "self_check") && <div className="activityFooter"><button className="button soft" type="button" onClick={check}>{locale === "vi" ? "Kiểm tra" : "Check"}</button>{message && <p className="activityMessage">{message}</p>}</div>}
    </article>
  );
}
