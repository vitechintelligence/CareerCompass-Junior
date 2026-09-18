import Link from "next/link";
import { notFound } from "next/navigation";
import { VitechMark } from "@/app/VitechMark";
import { getPublishedUnit, listPublishedUnits } from "@/lib/curriculum";
import { getBookCatalogItem, getCatalogUnit } from "@/lib/book-catalog";
import GenericActivity from "./GenericActivity";

export const dynamic = "force-dynamic";

export default async function DatabaseUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookCode: string; unitCode: string }>;
  searchParams: Promise<{ lang?: string; enrollmentId?: string }>;
}) {
  const { bookCode, unitCode } = await params;
  const { lang, enrollmentId } = await searchParams;
  const locale: "en" | "vi" = lang === "vi" ? "vi" : "en";

  const databaseUnit = await getPublishedUnit(bookCode, unitCode);
  const unit = databaseUnit ?? getCatalogUnit(bookCode, unitCode);
  if (!unit) notFound();

  const databaseUnits = await listPublishedUnits(bookCode);
  const catalogBook = getBookCatalogItem(bookCode);
  const units = databaseUnits.length > 0
    ? databaseUnits
    : (catalogBook?.units ?? []).map((item) => ({
        code: item.code,
        unit_number: item.unitNumber,
        title_en: item.titleEn,
        title_vi: item.titleVi,
      }));
  const sourceLabel = databaseUnit ? "Database-driven" : "Interactive catalog";

  return (
    <main className="lessonApp">
      <header className="topbar lessonTopbar">
        <Link className="brand" href={`/learn/${encodeURIComponent(bookCode)}?${enrollmentId ? `enrollmentId=${encodeURIComponent(enrollmentId)}` : ""}`}><VitechMark /><span>Career Compass Junior</span></Link>
        <div className="lessonHeaderActions">
          {bookCode === "CCJ-MASTERY-BEGINNER" && unitCode === "U01" && <Link className="pill" href={`/learn/unit-1?lang=${locale}${enrollmentId ? `&enrollmentId=${encodeURIComponent(enrollmentId)}` : ""}`}>{locale === "vi" ? "Mở trải nghiệm nâng cao" : "Open enhanced experience"}</Link>}
          <Link className="pill" href={`/learn/${encodeURIComponent(bookCode)}/${encodeURIComponent(unitCode)}?lang=${locale === "vi" ? "en" : "vi"}${enrollmentId ? `&enrollmentId=${encodeURIComponent(enrollmentId)}` : ""}`}>{locale === "vi" ? "English" : "Tiếng Việt"}</Link>
        </div>
      </header>

      <div className="lessonShell">
        <aside className="lessonSidebar">
          <div className="eyebrow">{unit.bookCode}</div>
          <h2 className="lessonUnitTitle">{locale === "vi" ? unit.bookTitleVi : unit.bookTitleEn}</h2>
          <p className="muted lessonSmallCopy">{unit.levelLabel || ""}{unit.ageBand ? ` · Ages ${unit.ageBand}` : ""}</p>
          <nav className="lessonNav" aria-label="Published book units">
            {units.map((item) => <Link className={`lessonNavItem ${String(item.code) === unit.unitCode ? "active" : ""}`} key={String(item.code)} href={`/learn/${encodeURIComponent(bookCode)}/${encodeURIComponent(String(item.code))}?lang=${locale}${enrollmentId ? `&enrollmentId=${encodeURIComponent(enrollmentId)}` : ""}`}><span className="lessonNavNumber">{String(item.unit_number)}</span><span><strong>{locale === "vi" ? String(item.title_vi) : String(item.title_en)}</strong><small>{String(item.code)}</small></span></Link>)}
          </nav>
        </aside>

        <section className="lessonStage">
          <div className="lessonHeroCard">
            <div><div className="eyebrow">{unit.unitCode} · {locale === "vi" ? `Bài ${unit.unitNumber}` : `Unit ${unit.unitNumber}`}</div><h1 className="lessonTitle">{locale === "vi" ? unit.titleVi : unit.titleEn}</h1><p className="lessonViSub">{locale === "vi" ? unit.titleEn : unit.titleVi}</p></div>
            <span className="lessonStatus">{sourceLabel}</span>
          </div>

          <div className="lessonGrid twoCol">
            <article className="lessonCard canDoCard"><div className="lessonSectionLabel">{locale === "vi" ? "Mục tiêu" : "Learning objective"}</div><h3>{locale === "vi" ? unit.objectiveVi : unit.objectiveEn}</h3></article>
            <article className="lessonCard missionCard"><div className="lessonSectionLabel">Career Compass × Mastery English</div><p><strong>{unit.careerCompassFocus}</strong></p><p className="muted">{unit.masteryEnglishFocus}</p></article>
          </div>

          {unit.activities.length === 0 ? <article className="lessonCard"><p className="muted">{locale === "vi" ? "Nội dung tương tác của bài này đang được chuẩn bị." : "Interactive content for this unit is being prepared."}</p></article> : unit.activities.map((activity) => <GenericActivity activity={activity} locale={locale} bookCode={unit.bookCode} unitCode={unit.unitCode} enrollmentId={enrollmentId ?? null} key={activity.id} />)}
        </section>
      </div>
    </main>
  );
}
