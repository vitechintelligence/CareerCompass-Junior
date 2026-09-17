import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { interactiveBooks } from "@/lib/book-catalog";

export default function BooksPage() {
  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>Interactive Book Collection</strong><div className="muted" style={{ fontSize: 12 }}>Ages 4–18 · bilingual learning</div></div>
        <Link className="pill" href="/portal/student">Student Portal</Link>
      </header>
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div><div className="eyebrow">ViTech Educational Book Collection</div><h1 className="workspaceHeroTitle">Four books. One connected learning journey.</h1><p className="muted">Each title can launch interactive vocabulary, speaking models, checks, reflection and learner evidence while remaining anchored to the printed book.</p></div>
        </section>
        <section className="cardGrid">
          {interactiveBooks.map((book) => (
            <article className="card" key={book.code}>
              <div className="cardIcon">{book.accent}</div>
              <span className="pill">Ages {book.ageBand} · {book.level}</span>
              <h2 style={{ marginBottom: 4 }}>{book.title}</h2>
              <strong>{book.subtitle}</strong>
              <p className="muted">{book.description}</p>
              <div className="tagRow"><span className="tag">{book.bilingual ? "EN · VI" : "EN"}</span><span className="tag">Interactive</span><span className="tag">Evidence-ready</span></div>
              <div className="actions">
                <Link className="button primary" href={`/learn/${book.code}`}>Open book</Link>
                <Link className="button soft" href={`/learn/${book.code}/${book.units[0].code}?lang=en`}>Start Unit 1</Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
