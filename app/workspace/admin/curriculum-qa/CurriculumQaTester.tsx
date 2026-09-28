"use client";

import { useMemo, useState } from "react";

type Props = {
  activityId: string;
  activityCode: string;
  inputType: string;
  content: Record<string, unknown>;
};

export default function CurriculumQaTester({ activityId, activityCode, inputType, content }: Props) {
  const options = useMemo(
    () => Array.isArray(content.options) ? content.options.map(String) : [],
    [content.options],
  );
  const sequence = useMemo(
    () => Array.isArray(content.sequence) ? content.sequence.map(String) : [],
    [content.sequence],
  );
  const [selected, setSelected] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [state, setState] = useState<"idle"|"testing"|"failed">("idle");

  async function run() {
    let response: Record<string, unknown>;
    if (inputType === "single_choice") response = { selected };
    else if (inputType === "sequence") response = { sequence: ordered };
    else if (inputType === "text" || inputType === "speaking_text") response = { text };
    else response = { selfReported: true };

    setState("testing");
    setResult(null);
    try {
      const res = await fetch("/api/admin/curriculum-qa/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activityId, response }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ error: data?.error || "qa_test_failed" });
        setState("failed");
        return;
      }
      setResult(data);
      setState("idle");
    } catch {
      setResult({ error: "qa_test_failed" });
      setState("failed");
    }
  }

  return <section className="panel">
    <div className="eyebrow">Test as Learner · {activityCode}</div>
    <p className="muted">This simulation uses the production evaluator but writes no learner attempt, progress, score, or evidence.</p>

    {options.length > 0 && <div className="choiceGrid">
      {options.map(option => <button className={`choiceButton ${selected===option?"selected":""}`} type="button" key={option} onClick={()=>setSelected(option)}>{option}</button>)}
    </div>}

    {sequence.length > 0 && <div>
      <div className="choiceGrid">{sequence.map(item => <button type="button" className={`choiceButton ${ordered.includes(item)?"selected":""}`} key={item} onClick={()=>setOrdered(cur=>cur.includes(item)?cur.filter(v=>v!==item):[...cur,item])}>{ordered.includes(item) ? `${ordered.indexOf(item)+1}. ` : ""}{item}</button>)}</div>
      <button className="textButton" type="button" onClick={()=>setOrdered([])}>Reset order</button>
    </div>}

    {(inputType === "text" || inputType === "speaking_text") && <textarea rows={5} value={text} onChange={e=>setText(e.target.value)} placeholder="Enter a learner-style response" />}

    <div className="actions" style={{marginTop:12}}>
      <button className="button primary" type="button" disabled={state==="testing"} onClick={run}>{state==="testing"?"Testing…":"Run learner simulation"}</button>
    </div>

    {result && <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",marginTop:12}}>{JSON.stringify(result,null,2)}</pre>}
  </section>;
}
