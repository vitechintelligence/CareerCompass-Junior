import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";

export const metadata = { title: "Offline Practice | Career Compass Junior" };

const words = [
  ["hello", "xin chào"],
  ["help", "giúp đỡ"],
  ["skill", "kỹ năng"],
  ["idea", "ý tưởng"],
  ["future", "tương lai"],
  ["because", "bởi vì"],
];

export default function OfflinePracticePage() {
  return <main className="workspacePage">
    <header className="topbar">
      <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
      <strong>Offline Practice Pack</strong>
      <Link className="pill" href="/offline">Offline help</Link>
    </header>
    <div className="workspaceContent">
      <section className="panel">
        <div className="eyebrow">Public offline practice</div>
        <h1 className="workspaceHeroTitle">Practice safely without pretending the LMS is online.</h1>
        <p className="muted">These activities are not graded, do not change your account progress, and do not create verified evidence. Reconnect for class work, saved attempts, teacher feedback and reports.</p>
      </section>

      <section className="panel">
        <div className="eyebrow">Vocabulary recall</div>
        <div className="cardGrid">
          {words.map(([en,vi]) => <article className="miniCard light" key={en}><strong>{en}</strong><span>{vi}</span><small>Say the English word, then make one short sentence.</small></article>)}
        </div>
      </section>

      <section className="workspaceGrid">
        <article className="panel"><div className="eyebrow">Speak</div><h2 className="workspaceTitle">30-second compass</h2><p>Say: “My name is ____. I like ____. I am good at ____. Today I want to learn ____.”</p></article>
        <article className="panel"><div className="eyebrow">Reflect</div><h2 className="workspaceTitle">One small step</h2><p>Think of one task you found difficult. Say what you tried, what changed, and what you will try next.</p></article>
        <article className="panel"><div className="eyebrow">Observe</div><h2 className="workspaceTitle">Skills around me</h2><p>Choose one person helping your community. Name two skills they use and one reason those skills matter.</p></article>
        <article className="panel"><div className="eyebrow">Create</div><h2 className="workspaceTitle">Paper prototype</h2><p>Sketch an object that helps someone. Label three parts in English. Explain one design choice using “because”.</p></article>
      </section>
    </div>
  </main>;
}
