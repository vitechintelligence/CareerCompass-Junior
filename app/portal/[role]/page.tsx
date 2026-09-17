import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile } from "@/lib/auth/profile";
import { bookUnits, portalCopy, t, type Locale, type PortalRole } from "@/lib/platform";

export const dynamic = "force-dynamic";

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
  if (role === "student") {
    const profile = await getCurrentProfile();
    if (profile?.account_type === "student") redirect("/workspace/student");
  }

  const locale: Locale = lang === "vi" ? "vi" : "en";
  const copy = portalCopy[role];
  const otherLocale: Locale = locale === "en" ? "vi" : "en";

  return (
    <main className="portalPage">
      <header className="topbar">
        <Link className="brand" href="/">
          <VitechMark />
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
        <div className="previewNotice" role="note">
          <strong>{locale === "en" ? "Public portal preview" : "Bản xem trước cổng thông tin"}</strong>
          <span>{locale === "en" ? "Example metrics below demonstrate the interface. Signed-in workspaces use live Neon data and role-scoped access." : "Các số liệu bên dưới chỉ minh họa giao diện. Không gian đăng nhập sử dụng dữ liệu Neon thực và quyền truy cập theo vai trò."}</span>
        </div>

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
            <span className="pill">{locale === "en" ? "Example day" : "Ngày minh họa"}</span>
            <h3 style={{ fontSize: 26, marginTop: 18 }}>
              {role === "student" && (locale === "en" ? "Your next small win" : "Bước tiến tiếp theo của em")}
              {role === "teacher" && (locale === "en" ? "What needs attention" : "Nội dung cần xử lý")}
              {role === "partner" && (locale === "en" ? "Program pulse" : "Tình hình chương trình")}
            </h3>
            <p className="muted">
              {role === "student" && (locale === "en" ? "A learner might finish a reflection and record one short speaking response." : "Học sinh có thể hoàn thành phần phản tư và ghi một đoạn nói ngắn.")}
              {role === "teacher" && (locale === "en" ? "A teacher can see submissions awaiting feedback and attendance exceptions for assigned classes." : "Giáo viên có thể xem bài nộp chờ phản hồi và trường hợp chuyên cần của lớp được phân công.")}
              {role === "partner" && (locale === "en" ? "A partner administrator can review delivery health across the organization they manage." : "Quản trị viên đối tác có thể xem tình hình triển khai trong tổ chức mình quản lý.")}
            </p>
            <div className="actions">
              {role === "student" && <Link className="button primary" href="/auth/sign-up?callbackURL=%2Fworkspace%2Fstudent">Activate student access</Link>}
              {role === "teacher" && <Link className="button primary" href="/auth/sign-in?callbackURL=%2Fworkspace%2Fteacher">Teacher sign in</Link>}
              {role === "partner" && <Link className="button primary" href="/workspace/partner">Partner access</Link>}
            </div>
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
            {role === "student" && (
              <div className="actions" style={{ marginTop: 14, marginBottom: 6 }}>
                <Link className="button primary" href={`/learn/unit-1?lang=${locale}`}>
                  {locale === "en" ? "Start Unit 1 interactive" : "Bắt đầu Bài 1 tương tác"}
                </Link>
              </div>
            )}
            <div>
              {bookUnits.map((unit) => (
                <div className="unit" key={unit.code}>
                  <div className="unitTop"><strong>{unit.code} · {locale === "en" ? unit.en : unit.vi}</strong><span className="muted">Sample {unit.progress}%</span></div>
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
