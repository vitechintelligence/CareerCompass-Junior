import Link from "next/link";
import { notFound } from "next/navigation";
import { bookUnits, portalCopy, t, type Locale, type PortalRole } from "@/lib/platform";

const roles: PortalRole[] = ["student", "teacher", "partner"];

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { role: rawRole } = await params;
  const { lang } = await searchParams;
  if (!roles.includes(rawRole as PortalRole)) notFound();

  const role = rawRole as PortalRole;
  const locale: Locale = lang === "vi" ? "vi" : "en";
  const copy = portalCopy[role];
  const otherLocale: Locale = locale === "en" ? "vi" : "en";

  return (
    <main className="portalPage">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brandMark">CC</span>
          <span>Career Compass Junior</span>
        </Link>
        <nav className="nav" aria-label="Portal switcher">
          <Link href={`/portal/student?lang=${locale}`}>Student</Link>
          <Link href={`/portal/teacher?lang=${locale}`}>Teacher</Link>
          <Link href={`/portal/partner?lang=${locale}`}>Partner</Link>
        </nav>
        <Link className="pill" href={`/portal/${role}?lang=${otherLocale}`}>
          {locale === "en" ? "Tiếng Việt" : "English"}
        </Link>
      </header>

      <div className="portalShell">
        <section className="portalHero">
          <div className="portalIntro">
            <div className="eyebrow">{t(copy.eyebrow, locale)}</div>
            <h2 style={{ marginTop: 10 }}>{t(copy.title, locale)}</h2>
            <p className="lead" style={{ fontSize: 18 }}>{t(copy.description, locale)}</p>
            <div className="metricGrid">
              {copy.metrics.map((metric) => (
                <div className="metric" key={metric.value + metric.label.en}>
                  <span className="muted">{t(metric.label, locale)}</span>
                  <strong>{metric.value}</strong>
                  <span className="muted">{t(metric.detail, locale)}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="focusPanel">
            <span className="pill">{locale === "en" ? "Today" : "Hôm nay"}</span>
            <h3 style={{ fontSize: 26, marginTop: 18 }}>
              {role === "student" && (locale === "en" ? "Your next small win" : "Bước tiến tiếp theo của em")}
              {role === "teacher" && (locale === "en" ? "What needs attention" : "Nội dung cần xử lý")}
              {role === "partner" && (locale === "en" ? "Program pulse" : "Tình hình chương trình")}
            </h3>
            <p className="muted">
              {role === "student" && (locale === "en" ? "Finish Unit 3 reflection and record one 30-second speaking response." : "Hoàn thành phần phản tư Bài 3 và ghi một đoạn nói 30 giây.")}
              {role === "teacher" && (locale === "en" ? "12 submissions are ready for feedback; Class J2 has two attendance exceptions." : "12 bài nộp đang chờ phản hồi; Lớp J2 có 2 trường hợp chuyên cần cần kiểm tra.")}
              {role === "partner" && (locale === "en" ? "Most classes are on track. One class is below the expected activity completion pace." : "Hầu hết các lớp đang đúng tiến độ. Một lớp đang thấp hơn tốc độ hoàn thành hoạt động dự kiến.")}
            </p>
            <div className="actions"><a className="button soft" href="#workspace">{locale === "en" ? "Open workspace" : "Mở không gian làm việc"}</a></div>
          </aside>
        </section>

        <section className="workspaceGrid" id="workspace">
          <div className="panel">
            <div className="eyebrow">{locale === "en" ? "Priority actions" : "Việc ưu tiên"}</div>
            <h3 style={{ marginTop: 10 }}>{locale === "en" ? "What you can do here" : "Bạn có thể làm gì ở đây"}</h3>
            <div className="actionList">
              {copy.actions.map((action) => (
                <a className="actionItem" href={action.href} key={action.title.en}>
                  <div>
                    <strong>{t(action.title, locale)}</strong>
                    <div className="muted" style={{ marginTop: 4 }}>{t(action.description, locale)}</div>
                  </div>
                  <span aria-hidden="true">→</span>
                </a>
              ))}
            </div>
          </div>

          <div className="panel" id="learning">
            <div className="eyebrow">Career Compass Junior Mastery</div>
            <h3 style={{ marginTop: 10 }}>{locale === "en" ? "Interactive book journey" : "Hành trình sách tương tác"}</h3>
            <p className="muted">{locale === "en" ? "The book remains the curriculum anchor; digital activities add practice, feedback and evidence." : "Sách vẫn là trục chương trình; hoạt động số bổ sung luyện tập, phản hồi và minh chứng."}</p>
            <div>
              {bookUnits.map((unit) => (
                <div className="unit" key={unit.code}>
                  <div className="unitTop"><strong>{unit.code} · {locale === "en" ? unit.en : unit.vi}</strong><span className="muted">{unit.progress}%</span></div>
                  <div className="progressTrack"><div className="progressFill" style={{ width: `${unit.progress}%` }} /></div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 7 }}>{unit.focus}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
