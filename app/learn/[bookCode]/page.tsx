import Link from "next/link";
import { notFound } from "next/navigation";
import { VitechMark } from "@/app/VitechMark";
import { getBookCatalogItem } from "@/lib/book-catalog";
import { fullInteractiveStartHash, getFullInteractiveBook } from "@/lib/full-interactive-books";
import FullInteractiveBookEmbed from "./FullInteractiveBookEmbed";

export default async function BookOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookCode: string }>;
  searchParams: Promise<{ lang?: string; start?: string; enrollmentId?: string }>;
}) {
  const { bookCode } = await params;
  const { lang, start, enrollmentId } = await searchParams;
  const locale: "en" | "vi" = lang === "vi" ? "vi" : "en";
  const learningEnrollmentId = typeof enrollmentId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(enrollmentId)
    ? enrollmentId
    : undefined;
  const enrollmentQuery = learningEnrollmentId ? `&enrollmentId=${encodeURIComponent(learningEnrollmentId)}` : "";
  const book = getBookCatalogItem(bookCode);
  if (!book) notFound();

  const fullInteractive = getFullInteractiveBook(bookCode);
  if (fullInteractive) {
    const startHash = fullInteractiveStartHash(bookCode, start);
    const scopeQuery = learningEnrollmentId
      ? `?scope=${encodeURIComponent(learningEnrollmentId)}`
      : "";
    return (
      <FullInteractiveBookEmbed
        title={book.title}
        subtitle={book.subtitle}
        summary={fullInteractive.lessonSummary}
        source={`/interactive-books/${fullInteractive.slug}${scopeQuery}${startHash}`}
      />
    );
  }

  return (
    <main className="lessonApp">
      <header className="topbar lessonTopbar">
        <Link className="brand" href="/books"><VitechMark /><span>Interactive Books</span></Link>
        <div className="lessonHeaderActions"><Link className="pill" href={`/learn/${book.code}?lang=${locale === "vi" ? "en" : "vi"}${enrollmentQuery}`}>{locale === "vi" ? "English" : "Tiếng Việt"}</Link></div>
      </header>
      <div className="lessonShell">
        <aside className="lessonSidebar">
          <div className="cardIcon">{book.accent}</div>
          <div className="eyebrow">{book.code}</div>
          <h2 className="lessonUnitTitle">{book.title}</h2>
          <p><strong>{book.subtitle}</strong></p>
          <p className="muted lessonSmallCopy">Ages {book.ageBand} · {book.level} · {book.bilingual ? "Bilingual EN–VI" : "English"}</p>
          <Link className="button soft" href="/books">All books</Link>
        </aside>
        <section className="lessonStage">
          <div className="lessonHeroCard">
            <div><div className="eyebrow">Interactive edition</div><h1 className="lessonTitle">{book.title}</h1><p className="lessonViSub">{book.subtitle}</p></div>
            <span className="lessonStatus">Book → App</span>
          </div>
          <article className="lessonCard"><p className="lead" style={{ fontSize: 18 }}>{book.description}</p><p className="muted">{locale === "vi" ? "Mỗi bài kết hợp nội dung sách với từ vựng có âm thanh, mẫu nói, hoạt động tương tác và minh chứng học tập." : "Each unit combines the printed-book sequence with audio vocabulary, speaking models, interactive checks and learning evidence."}</p></article>
          <div className="workspaceGrid">
            {book.units.map((unit) => (
              <article className="panel" key={unit.code}>
                <div className="eyebrow">{unit.code} · {locale === "vi" ? `Bài ${unit.unitNumber}` : `Unit ${unit.unitNumber}`}</div>
                <h2 className="workspaceTitle">{locale === "vi" ? unit.titleVi : unit.titleEn}</h2>
                <p className="muted">{locale === "vi" ? unit.objectiveVi : unit.objectiveEn}</p>
                <div className="tagRow"><span className="tag">{unit.careerCompassFocus}</span><span className="tag">Mastery English</span></div>
                <div className="actions"><Link className="button primary" href={`/learn/${book.code}/${unit.code}?lang=${locale}${enrollmentQuery}`}>{locale === "vi" ? "Mở bài tương tác" : "Open interactive unit"}</Link></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
