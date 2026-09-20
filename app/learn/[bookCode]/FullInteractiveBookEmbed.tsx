import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";

export default function FullInteractiveBookEmbed({
  title,
  subtitle,
  source,
  summary,
}: {
  title: string;
  subtitle: string;
  source: string;
  summary: string;
}) {
  return (
    <main style={{ minHeight: "100vh", background: "#eef3f8" }}>
      <header className="topbar">
        <Link className="brand" href="/books"><VitechMark /><span>Interactive Books</span></Link>
        <div style={{ textAlign: "center" }}>
          <strong>{title}</strong>
          <div className="muted" style={{ fontSize: 12 }}>{summary} · bilingual interactive edition</div>
        </div>
        <Link className="pill" href="/books">Book library</Link>
      </header>
      <iframe
        allow="microphone"
        src={source}
        style={{ width: "100%", height: "calc(100vh - 76px)", border: 0, display: "block", background: "#fff" }}
        title={`${title} — ${subtitle} interactive edition`}
      />
    </main>
  );
}
