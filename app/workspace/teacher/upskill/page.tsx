import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { TEACHER_UPSKILL_MODULES, TEACHER_UPSKILL_NOTICE_EN, TEACHER_UPSKILL_NOTICE_VI } from "@/lib/teacher-upskill-catalog";
import { updateTeacherLearningProgress } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeacherUpskillPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const vi = lang === "vi";
  const user = await getSessionUser();
  if (!user) return <Gate />;

  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) return <Gate signedIn />;

  const sql = getDb();
  const rows = await sql`
    select module_key, status, completion_percent, completed_at, updated_at
    from teacher_learning_progress
    where teacher_id = ${profile.id}
  `;
  const progress = new Map(rows.map((row) => [String(row.module_key), row]));
  const completed = rows.filter((row) => String(row.status) === "completed").length;
  const inProgress = rows.filter((row) => String(row.status) === "in_progress").length;
  const hours = TEACHER_UPSKILL_MODULES.filter((module) => String(progress.get(module.key)?.status) === "completed")
    .reduce((sum, module) => sum + module.estimatedHours, 0);

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>{vi ? "Phát triển nghề nghiệp giáo viên" : "Teacher Professional Growth"}</strong><div className="muted" style={{ fontSize: 12 }}>{vi ? "Bồi dưỡng thực hành · minh chứng · phản tư" : "Practice · evidence · reflection"}</div></div>
        <div className="actions"><Link className="pill" href="/workspace/teacher/upskill?lang=en">EN</Link><Link className="pill" href="/workspace/teacher/upskill?lang=vi">VI</Link><Link className="pill" href="/workspace/teacher">Dashboard</Link></div>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">{vi ? "Upskill" : "Upskill"}</div>
            <h1 className="workspaceHeroTitle">{vi ? "Nâng năng lực dạy học theo công việc thật của giáo viên." : "Build teacher capability around the work teachers actually do."}</h1>
            <p className="muted">{vi ? TEACHER_UPSKILL_NOTICE_VI : TEACHER_UPSKILL_NOTICE_EN}</p>
          </div>
          <span className="pill">{String(profile.semantic_id)}</span>
        </section>

        <section className="metricGrid">
          <Metric label={vi ? "Hoàn thành" : "Completed"} value={String(completed)} detail={`${TEACHER_UPSKILL_MODULES.length} ${vi ? "mô-đun" : "modules"}`} />
          <Metric label={vi ? "Đang học" : "In progress"} value={String(inProgress)} detail={vi ? "Có thể tiếp tục bất kỳ lúc nào" : "Resume anytime"} />
          <Metric label={vi ? "Giờ phát triển" : "Growth hours"} value={String(hours)} detail={vi ? "Ước tính theo mô-đun đã hoàn thành" : "Estimated completed learning time"} />
        </section>

        <section className="cardGrid">
          {TEACHER_UPSKILL_MODULES.map((module) => {
            const state = progress.get(module.key);
            const status = String(state?.status || "not_started");
            return (
              <article className="card" key={module.key}>
                <span className="pill">{status.replaceAll("_", " ")}</span>
                <h2>{vi ? module.titleVi : module.titleEn}</h2>
                <p className="muted">{vi ? module.focusVi : module.focusEn}</p>
                <div className="tagRow">{module.alignment.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
                <div className="workspaceList" style={{ marginTop: 12 }}>
                  {(vi ? module.outcomesVi : module.outcomesEn).map((outcome) => <div className="workspaceRow" key={outcome}><span>✓ {outcome}</span></div>)}
                </div>
                <p className="muted" style={{ marginTop: 12 }}><b>{vi ? "Minh chứng:" : "Evidence:"}</b> {vi ? module.evidenceVi : module.evidenceEn}</p>
                <p className="muted">{module.estimatedHours} {vi ? "giờ ước tính" : "estimated hours"}</p>
                <form action={updateTeacherLearningProgress} className="actions">
                  <input type="hidden" name="moduleKey" value={module.key} />
                  {status !== "in_progress" && status !== "completed" && <button className="button soft" name="status" value="in_progress" type="submit">{vi ? "Bắt đầu" : "Start"}</button>}
                  {status !== "completed" && <button className="button primary" name="status" value="completed" type="submit">{vi ? "Đánh dấu hoàn thành" : "Mark complete"}</button>}
                  {status === "completed" && <button className="button" name="status" value="in_progress" type="submit">{vi ? "Học lại" : "Revisit"}</button>}
                </form>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function Gate({ signedIn = false }: { signedIn?: boolean }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Teacher Professional Growth</strong></header><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Teacher access not assigned" : "Sign in required"}</h2><p className="muted">Professional learning is available to activated teacher accounts.</p><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/teacher/upskill")}`}>Sign in</Link></section></div></main>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="metric"><span className="muted">{label}</span><strong>{value}</strong><span className="muted">{detail}</span></div>;
}
