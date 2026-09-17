import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { createAssignment, recordAttendance, saveFeedback } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeacherWorkspacePage() {
  const user = await getSessionUser();
  if (!user) {
    return <WorkspaceGate title="Teacher Workspace" copy="Sign in with a teacher account to open live classes, attendance and submissions." />;
  }

  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) {
    return <WorkspaceGate title="Teacher Workspace" copy="This signed-in account does not have teacher access. Teacher roles are assigned by an approved partner or platform administrator." signedIn />;
  }

  const sql = getDb();
  const isAdmin = profile.account_type === "platform_admin";
  const classes = isAdmin
    ? await sql`
        select c.id, c.name, c.level_label, c.academic_cycle, o.name as organization_name,
          count(distinct cm.student_id)::int as student_count
        from classes c
        join organizations o on o.id = c.organization_id
        left join class_memberships cm on cm.class_id = c.id and cm.status = 'active'
        where c.status = 'active'
        group by c.id, o.name
        order by c.name
n      `
    : await sql`
        select c.id, c.name, c.level_label, c.academic_cycle, o.name as organization_name,
          count(distinct cm.student_id)::int as student_count
        from teacher_assignments ta
        join classes c on c.id = ta.class_id
        join organizations o on o.id = c.organization_id
        left join class_memberships cm on cm.class_id = c.id and cm.status = 'active'
        where ta.teacher_id = ${profile.id} and c.status = 'active'
        group by c.id, o.name
        order by c.name
      `;

  const pending = isAdmin
    ? await sql`select count(*)::int as count from submissions where status = 'submitted'`
    : await sql`
        select count(*)::int as count
        from submissions s
        join assignments a on a.id = s.assignment_id
        join teacher_assignments ta on ta.class_id = a.class_id
        where ta.teacher_id = ${profile.id} and s.status = 'submitted'
      `;

  const recentSubmissions = isAdmin
    ? await sql`
        select s.id, s.status, s.submitted_at, a.title_en, a.title_vi, c.name as class_name,
          p.semantic_id as learner_semantic_id
        from submissions s
        join assignments a on a.id = s.assignment_id
        join classes c on c.id = a.class_id
        join profiles p on p.id = s.student_id
        order by s.submitted_at desc nulls last
        limit 8
      `
    : await sql`
        select s.id, s.status, s.submitted_at, a.title_en, a.title_vi, c.name as class_name,
          p.semantic_id as learner_semantic_id
        from submissions s
        join assignments a on a.id = s.assignment_id
        join classes c on c.id = a.class_id
        join teacher_assignments ta on ta.class_id = c.id
        join profiles p on p.id = s.student_id
        where ta.teacher_id = ${profile.id}
        order by s.submitted_at desc nulls last
        limit 8
      `;

  const firstClassId = String(classes[0]?.id || "");
  const roster = firstClassId
    ? await sql`
        select p.id, p.semantic_id
        from class_memberships cm
        join profiles p on p.id = cm.student_id
        where cm.class_id = ${firstClassId} and cm.status = 'active'
        order by p.semantic_id
      `
    : [];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="workspacePage">
      <WorkspaceHeader title="Teacher Workspace" subtitle="Live class operations · Neon-backed" />
      <div className="workspaceContent">
        <section className="metricGrid">
          <Metric label="Active classes" value={String(classes.length)} detail="Assigned to this account" />
          <Metric label="Learners" value={String(classes.reduce((sum, item) => sum + Number(item.student_count || 0), 0))} detail="Across active classes" />
          <Metric label="Needs review" value={String(pending[0]?.count || 0)} detail="Submitted work" />
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Classes</div>
            <h2 className="workspaceTitle">My class workspace</h2>
            {classes.length === 0 ? (
              <EmptyState text="No active classes are assigned yet. Once a partner assigns a class, it will appear here automatically." />
            ) : (
              <div className="workspaceList">
                {classes.map((item) => (
                  <div className="workspaceRow" key={String(item.id)}>
                    <div><strong>{String(item.name)}</strong><div className="muted">{String(item.organization_name)} · {String(item.level_label || "Level not set")}</div></div>
                    <span className="pill">{String(item.student_count)} learners</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="eyebrow">Attendance</div>
            <h2 className="workspaceTitle">Record today</h2>
            {!firstClassId || roster.length === 0 ? (
              <EmptyState text="Attendance controls appear when your first class has active learners." />
            ) : (
              <form action={recordAttendance} className="workspaceForm">
                <input type="hidden" name="classId" value={firstClassId} />
                <label><span>Learner</span><select name="studentId" required>{roster.map((student) => <option key={String(student.id)} value={String(student.id)}>{String(student.semantic_id)}</option>)}</select></label>
                <label><span>Date</span><input name="sessionDate" type="date" defaultValue={today} required /></label>
                <label><span>Status</span><select name="status" defaultValue="present"><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="excused">Excused</option></select></label>
                <button className="button primary" type="submit">Save attendance</button>
              </form>
            )}
          </article>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Assignments</div>
            <h2 className="workspaceTitle">Publish class work</h2>
            {classes.length === 0 ? <EmptyState text="Assign a class before publishing work." /> : (
              <form action={createAssignment} className="workspaceForm">
                <label><span>Class</span><select name="classId">{classes.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name)}</option>)}</select></label>
                <label><span>English title</span><input name="titleEn" maxLength={160} required /></label>
                <label><span>Vietnamese title</span><input name="titleVi" maxLength={160} required /></label>
                <label><span>English instructions</span><textarea name="instructionsEn" maxLength={4000} rows={3} /></label>
                <label><span>Vietnamese instructions</span><textarea name="instructionsVi" maxLength={4000} rows={3} /></label>
                <label><span>Due</span><input name="dueAt" type="datetime-local" /></label>
                <button className="button primary" type="submit">Publish assignment</button>
              </form>
            )}
          </article>

          <article className="panel">
            <div className="eyebrow">Submissions</div>
            <h2 className="workspaceTitle">Review learner work</h2>
            {recentSubmissions.length === 0 ? <EmptyState text="No submissions are waiting yet." /> : (
              <div className="workspaceList">
                {recentSubmissions.map((item) => (
                  <form action={saveFeedback} className="feedbackCard" key={String(item.id)}>
                    <input type="hidden" name="submissionId" value={String(item.id)} />
                    <strong>{String(item.title_en)}</strong>
                    <div className="muted">{String(item.class_name)} · {String(item.learner_semantic_id)}</div>
                    <textarea name="feedbackText" maxLength={4000} rows={2} placeholder="Teacher feedback" required />
                    <div className="inlineFields"><input name="score" type="number" min="0" max="100" step="0.5" placeholder="Score" /><button className="button soft" type="submit">Return feedback</button></div>
                  </form>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

function WorkspaceGate({ title, copy, signedIn = false }: { title: string; copy: string; signedIn?: boolean }) {
  return <main className="workspacePage"><WorkspaceHeader title={title} subtitle="Role-protected workspace" /><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Access not assigned" : "Sign in required"}</h2><p className="muted">{copy}</p><div className="actions"><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/teacher")}`}>Sign in</Link><Link className="button" href="/portal/teacher">View public teacher preview</Link></div></section></div></main>;
}

function WorkspaceHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><div><strong>{title}</strong><div className="muted" style={{ fontSize: 12 }}>{subtitle}</div></div><Link className="pill" href="/portal/teacher">Portal preview</Link></header>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="metric"><span className="muted">{label}</span><strong>{value}</strong><span className="muted">{detail}</span></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>;
}
