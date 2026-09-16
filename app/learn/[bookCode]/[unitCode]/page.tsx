import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedUnit, listPublishedUnits } from "@/lib/curriculum";
import GenericActivity from "./GenericActivity";

export const dynamic = "force-dynamic";

export default async function DatabaseUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookCode: string; unitCode: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { bookCode, unitCode } = await params;
  const { lang } = await searchParams;
  const locale: "en" | "vi" = lang === "vi" ? "vi" : "en";
  const unit = await getPublishedUnit(bookCode, unitCode);
  if (!unit) notFound();
  const units = await listPublishedUnits(bookCode);

  return (
    <main className="lessonApp">
      <header className="topbar lessonTopbar">
        <Link className="brand" href="/"><span className="brandMark">CC</span><span>Career Compass Junior</span></Link>
        <div className="lessonHeaderActions">
          {bookCode === "CCJ-MASTERY-BEGINNER" && unitCode === "U01" && <Link className="pill" href={`/learn/unit-1?lang=${locale}`}>{locale === "vi" ? "Mở trải nghiệm nâng cao" : "Open enhanced experience"}</Link>}
          <Link className="pill" href={`/learn/${encodeURIComponent(bookCode)}/${encodeURIComponent(unitCode)}?lang=${locale === "vi" ? "en" : "vi"}`}>{locale === "vi" ? "English" : "Tiếng Việt"}</Link>
        </div>
      </header>

      <div className="lessonShell">
        <aside className="lessonSidebar">
          <div className="eyebrow">{unit.bookCode}</div>
          <h2 className="lessonUnitTitle">{locale === "vi" ? unit.bookTitleVi : unit.bookTitleEn}</h2>
          <p className="muted lessonSmallCopy">{unit.levelLabel || ""}{unit.ageBand ? ` · Ages ${unit.ageBand}` : ""}</p>
          <nav className="lessonNav" aria-label="Published book units">
            {units.map((item) => <Link className={`lessonNavItem ${String(item.code) === unit.unitCode ? "active" : ""}`} key={String(item.code)} href={`/learn/${encodeURIComponent(bookCode)}/${encodeURIComponent(String(item.code))}?lang=${locale}`}><span className="lessonNavNumber">{String(item.unit_number)}</span><span><strong>{locale === "vi" ? String(item.title_vi) : String(item.title_en)}</strong><small>{String(item.code)}</small></span></Link>)}
          </nav>
        </aside>

        <section className="lessonStage">
          <div className="lessonHeroCard">
            <div><div className="eyebrow">{unit.unitCode} · {locale === "vi" ? `Bài ${unit.unitNumber}` : `Unit ${unit.unitNumber}`}</div><h1 className="lessonTitle">{locale === "vi" ? unit.titleVi : unit.titleEn}</h1><p className="lessonViSub">{locale === "vi" ? unit.titleEn : unit.titleVi}</p></div>
            <span className="lessonStatus">Database-driven</span>
          </div>

          <div className="lessonGrid twoCol">
            <article className="lessonCard canDoCard"><div className="lessonSectionLabel">{locale === "vi" ? "Mục tiêu" : "Learning objective"}</div><h3>{locale === "vi" ? unit.objectiveVi : unit.objectiveEn}</h3></article>
            <article className="lessonCard missionCard"><div className="lessonSectionLabel">Career Compass × Mastery English</div><p><strong>{unit.careerCompassFocus}</strong></p><p className="muted">{unit.masteryEnglishFocus}</p></article>
          </div>

          {unit.activities.length === 0 ? <article className="lessonCard"><p className="muted">{locale === "vi" ? "Nội dung tương tác của bài này đang được chuẩn bị." : "Interactive content for this unit is being prepared."}</p></article> : unit.activities.map((activity) => <GenericActivity activity={activity} locale={locale} key={activity.id} />)}
        </section>
      </div>
    </main>
  );
}
