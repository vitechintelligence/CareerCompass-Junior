import Link from "next/link";
import { listPublishedBooks } from "@/lib/books";

export const dynamic = "force-dynamic";

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const locale = lang === "vi" ? "vi" : "en";
  const books = await listPublishedBooks();

  return (
    <main style={{ minHeight: "100vh", background: "#f6f9fb", color: "#17314f", padding: "32px 20px 64px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 32 }}>
          <div>
            <div style={{ color: "#0c8f88", fontWeight: 800, letterSpacing: ".08em", fontSize: 13 }}>VITECH INTELLIGENCE SOLUTIONS</div>
            <h1 style={{ margin: "8px 0", fontSize: "clamp(32px,5vw,56px)", lineHeight: 1.02 }}>Educational Book Collection</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 18 }}>English • Life Skills • Future Readiness &nbsp;|&nbsp; Ages 4–18</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href={`/portal/student?lang=${locale}`} style={{ padding: "11px 16px", borderRadius: 999, background: "white", border: "1px solid #dbe3ea", color: "#17314f", textDecoration: "none", fontWeight: 700 }}>Student Portal</Link>
            <Link href={`/books?lang=${locale === "vi" ? "en" : "vi"}`} style={{ padding: "11px 16px", borderRadius: 999, background: "#0c8f88", color: "white", textDecoration: "none", fontWeight: 700 }}>{locale === "vi" ? "English" : "Tiếng Việt"}</Link>
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 22 }}>
          {books.map((book) => {
            const href = book.firstUnitCode ? `/learn/${encodeURIComponent(book.code)}/${encodeURIComponent(book.firstUnitCode)}?lang=${locale}` : "#";
            return (
              <article key={book.code} style={{ background: "white", borderRadius: 22, padding: 20, boxShadow: "0 18px 48px rgba(23,49,79,.09)", border: "1px solid #e7edf2", display: "flex", flexDirection: "column", minHeight: 390 }}>
                <div style={{ borderRadius: 16, minHeight: 190, background: "linear-gradient(145deg,#17314f,#0c8f88)", color: "white", padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
                  <div style={{ fontSize: 12, letterSpacing: ".08em", opacity: .8 }}>{book.ageBand ? `AGES ${book.ageBand}` : "INTERACTIVE BOOK"}</div>
                  <div><h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.05 }}>{locale === "vi" ? book.titleVi : book.titleEn}</h2><div style={{ marginTop: 8, opacity: .8 }}>{book.levelLabel || "Interactive learning"}</div></div>
                </div>
                <div style={{ padding: "18px 4px 4px", flex: 1 }}>
                  <div style={{ display: "inline-block", padding: "6px 10px", borderRadius: 999, background: "#e7f5f3", color: "#08776f", fontSize: 12, fontWeight: 800 }}>{book.publishedUnits} {locale === "vi" ? "bài tương tác" : "interactive units"}</div>
                  <p style={{ color: "#64748b", lineHeight: 1.6 }}>{(locale === "vi" ? book.descriptionVi : book.descriptionEn) || (locale === "vi" ? "Sách tương tác trong hệ sinh thái Career Compass." : "Interactive book in the Career Compass learning ecosystem.")}</p>
                </div>
                {book.firstUnitCode ? <Link href={href} style={{ textAlign: "center", padding: "12px 14px", borderRadius: 12, background: "#17314f", color: "white", textDecoration: "none", fontWeight: 800 }}>{locale === "vi" ? "Mở sách tương tác" : "Open interactive book"}</Link> : <span style={{ textAlign: "center", padding: "12px 14px", borderRadius: 12, background: "#eef2f5", color: "#64748b", fontWeight: 700 }}>{locale === "vi" ? "Đang chuẩn bị nội dung" : "Content being prepared"}</span>}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
