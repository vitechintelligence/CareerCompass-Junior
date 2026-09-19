import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { interactiveBooks } from "@/lib/book-catalog";

export default function BooksPage() {
  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>Interactive Book Pathways</strong><div className="muted" style={{ fontSize: 12 }}>Ages 4–18 · bilingual learning</div></div>
        <Link className="pill" href="/portal/student">Student Portal</Link>
      </header>
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div><div className="eyebrow">ViTech Educational Book Collection</div><h1 className="workspaceHeroTitle">Four books. One connected learning journey.</h1><p className="muted">MY COMPASS now links to its complete interactive ebook. The other titles keep their in-platform interactive pathways while full-book conversion continues against the latest print editions.</p></div>
        </section>
        <section className="cardGrid">
          {interactiveBooks.map((book) => (
            <article className="card" key={book.code}>
              <div className="cardIcon">{book.accent}</div>
              <span className="pill">Ages {book.ageBand} · {book.level}</span>
              <h2 style={{ marginBottom: 4 }}>{book.title}</h2>
              <strong>{book.subtitle}</strong>
              <p className="muted">{book.description}</p>
              <div className="tagRow">
                <span className="tag">{book.bilingual ? "EN · VI" : "EN"}</span>
                <span className="tag">{book.interactiveStatus === "complete" ? "Complete interactive ebook" : "Interactive preview"}</span>
                <span className="tag">Evidence-ready</span>
              </div>
              <div className="actions">
                {book.interactiveUrl ? (
                  <a className="button primary" href={book.interactiveUrl} target="_blank" rel="noreferrer">Open complete ebook ↗</a>
                ) : (
                  <Link className="button primary" href={`/learn/${book.code}`}>Open book</Link>
                )}
                {book.interactiveUrl ? (
                  <a className="button soft" href={book.interactiveUrl} target="_blank" rel="noreferrer">Launch MY COMPASS</a>
                ) : (
                  <Link className="button soft" href={`/learn/${book.code}/${book.units[0].code}?lang=en`}>Start Unit 1</Link>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
