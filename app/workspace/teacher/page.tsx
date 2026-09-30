import Link from "next/link";
import { redirect } from "next/navigation";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getPlatformAdminContext } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { createAssignment, recordAttendance, reviewSubmission } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeacherWorkspacePage() {
  const user = await getSessionUser();
  if (!user) {
    return <WorkspaceGate title="Teacher Workspace" copy="Sign in with a teacher account to open live classes, attendance and submissions." />;
  }

  const admin = await getPlatformAdminContext();
  if (admin) redirect("/workspace/admin");

  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active" || !["teacher", "platform_admin"].includes(profile.account_type)) {
    return <WorkspaceGate title="Teacher Workspace" copy="This signed-in account does not have teacher access. Teacher roles are assigned by an approved partner or platform administrator." signedIn />;
  }

  const sql = getDb();
  const isAdmin = profile.account_type === "platform_admin";
  const classes = isAdmin
    ? await sql`
        select c.id, c.name, c.level_label, c.academic_cycle, c.class_scope, c.subject_label, o.name as organization_name,
          count(distinct cm.student_id)::int as student_count
        from classes c
        join organizations o on o.id = c.organization_id and o.status='active'
        left join class_memberships cm on cm.class_id = c.id and cm.status = 'active'
        where c.status = 'active'
        group by c.id, o.name
        order by c.name
      `
    : await sql`
        select c.id, c.name, c.level_label, c.academic_cycle, c.class_scope, c.subject_label, o.name as organization_name,
          count(distinct cm.student_id)::int as student_count
        from teacher_assignments ta
        join classes c on c.id = ta.class_id
        join organizations o on o.id = c.organization_id and o.status='active'
        join organization_memberships om
          on om.organization_id=c.organization_id
         and om.profile_id=ta.teacher_id
         and om.role='teacher'
         and om.status='active'
        left join class_memberships cm on cm.class_id = c.id and cm.status = 'active'
        where ta.teacher_id = ${profile.id} and c.status = 'active'
        group by c.id, o.name
        order by c.name
      `;


  const programClasses = classes.filter((item) => String(item.class_scope || "program") !== "teacher_custom");
  const myClassrooms = classes.filter((item) => String(item.class_scope || "program") === "teacher_custom");
  const classIds = classes.map((item) => String(item.id));

  const [attendancePulse, assessmentPulse, learningPulse] = await Promise.all([
    classIds.length === 0 ? [] : sql`
      select
        count(*) filter (where a.status='absent')::int as absent_count,
        count(*) filter (where a.status='late')::int as late_count
      from attendance a
      where a.class_id = any(${classIds}::uuid[])
        and a.session_date >= current_date - interval '7 days'
    `,
    classIds.length === 0 ? [] : sql`
      select
        count(distinct a.id) filter (where a.status='published')::int as published_count,
        count(distinct aa.id) filter (where aa.status='submitted')::int as submitted_attempts
      from assessments a
      left join assessment_attempts aa on aa.assessment_id=a.id
      where a.class_id = any(${classIds}::uuid[])
    `,
    sql`
      select
        count(*) filter (where status='completed')::int as completed_count,
        count(*) filter (where status='in_progress')::int as in_progress_count
      from teacher_learning_progress
      where teacher_id=${profile.id}
    `,
  ]);
  const attention = classIds.length === 0
    ? [{ pending_review: 0, learner_retry: 0, overdue_count: 0, milestone_count: 0 }]
    : await sql`
        select
          (
            select count(*)::int
            from submissions s
            join assignments a on a.id=s.assignment_id
            where a.class_id=any(${classIds}::uuid[])
              and s.status='submitted'
          ) as pending_review,
          (
            select count(*)::int
            from submissions s
            join assignments a on a.id=s.assignment_id
            where a.class_id=any(${classIds}::uuid[])
              and s.status='returned'
          ) as learner_retry,
          (
            select count(*)::int
            from assignments a
            join class_memberships cm on cm.class_id=a.class_id and cm.status='active'
            left join submissions s
              on s.assignment_id=a.id and s.student_id=cm.student_id
            where a.class_id=any(${classIds}::uuid[])
              and a.status='published'
              and a.due_at is not null
              and a.due_at < now()
              and (s.id is null or s.status in ('draft','returned'))
          ) as overdue_count,
          (
            select count(*)::int
            from learning_capsules lc
            where lc.class_id=any(${classIds}::uuid[])
              and lc.status='draft'
          ) as milestone_count
      `;

  const recentSubmissions = isAdmin
    ? await sql`
        select s.id, s.status, s.response, s.current_revision, s.submitted_at,
          a.id as assignment_id, a.title_en, a.title_vi, c.name as class_name,
          p.semantic_id as learner_semantic_id
        from submissions s
        join assignments a on a.id = s.assignment_id
        join classes c on c.id = a.class_id
        join profiles p on p.id = s.student_id
        order by s.submitted_at desc nulls last
        limit 8
      `
    : await sql`
        select s.id, s.status, s.response, s.current_revision, s.submitted_at,
          a.id as assignment_id, a.title_en, a.title_vi, c.name as class_name,
          p.semantic_id as learner_semantic_id
        from submissions s
        join assignments a on a.id = s.assignment_id
        join classes c on c.id = a.class_id and c.status='active'
        join organizations o on o.id=c.organization_id and o.status='active'
        join teacher_assignments ta on ta.class_id = c.id
        join organization_memberships om
          on om.organization_id=c.organization_id
         and om.profile_id=ta.teacher_id
         and om.role='teacher'
         and om.status='active'
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
          <Metric label="Program classes" value={String(programClasses.length)} detail="ViTech program delivery" />
          <Metric label="My Classroom" value={String(myClassrooms.length)} detail="Teacher-owned school classes" />
          <Metric label="Learners" value={String(classes.reduce((sum, item) => sum + Number(item.student_count || 0), 0))} detail="Across active classes" />
          <Metric label="Needs review" value={String(attention[0]?.pending_review || 0)} detail="Submitted revisions" />
          <Metric label="Learner retry" value={String(attention[0]?.learner_retry || 0)} detail="Returned for improvement" />
          <Metric label="Overdue" value={String(attention[0]?.overdue_count || 0)} detail="Past due and not verified" />
          <Metric label="Evidence verify" value={String(attention[0]?.milestone_count || 0)} detail="Draft milestones" />
          <Metric label="Assessments" value={String(assessmentPulse[0]?.published_count || 0)} detail={`${String(assessmentPulse[0]?.submitted_attempts || 0)} attempts need review`} />
          <Metric label="Attendance flags" value={String(Number(attendancePulse[0]?.absent_count || 0) + Number(attendancePulse[0]?.late_count || 0))} detail="Absent / late in last 7 days" />
        </section>

        <section className="panel">
          <div className="eyebrow">Needs My Attention</div>
          <h2 className="workspaceTitle">Act on the learning loop, not just the task list.</h2>
          <div className="miniGrid">
            <div className="miniCard light"><strong>{String(attention[0]?.pending_review || 0)}</strong><span>submitted revisions waiting for review</span></div>
            <div className="miniCard light"><strong>{String(attention[0]?.learner_retry || 0)}</strong><span>learners improving returned work</span></div>
            <div className="miniCard light"><strong>{String(attention[0]?.overdue_count || 0)}</strong><span>overdue learner-assignment items</span></div>
            <div className="miniCard light"><strong>{String(attention[0]?.milestone_count || 0)}</strong><span>draft evidence milestones awaiting verification</span></div>
          </div>
        </section>

        <section className="panel">
          <div className="eyebrow">Teacher command dashboard</div>
          <h2 className="workspaceTitle">Everything you manage, one click away</h2>
          <div className="actionList">
            <Link className="actionItem" href="/workspace/teacher/my-classroom"><div><strong>My Classroom</strong><div className="muted">Manage regular school subjects separately from ViTech programs.</div></div><span>→</span></Link>
            <Link className="actionItem" href="/workspace/teacher/ai-learning"><div><strong>Professor Vi · Review Queue</strong><div className="muted">Review AI-generated study packs when your school requires human release.</div></div><span>→</span></Link>\n            <Link className="actionItem" href="/workspace/teacher/assessments"><div><strong>Quizzes & Exams</strong><div className="muted">Deploy assessments directly to students and track attempts.</div></div><span>→</span></Link>
            <Link className="actionItem" href="/workspace/teacher/upskill"><div><strong>Professional Growth</strong><div className="muted">{String(learningPulse[0]?.completed_count || 0)} modules completed · {String(learningPulse[0]?.in_progress_count || 0)} in progress.</div></div><span>→</span></Link>
            <Link className="actionItem" href="/steam-lab"><div><strong>STEAM Lab</strong><div className="muted">Run age-level experiential missions and review learner evidence.</div></div><span>→</span></Link>
            <Link className="actionItem" href="/workspace/teacher/community"><div><strong>Community Controls</strong><div className="muted">Use only the learner/community permissions delegated by your school administrator.</div></div><span>→</span></Link>
            <Link className="actionItem" href="/programs/future-skills"><div><strong>AI & Robotics curriculum</strong><div className="muted">Age-progressive technical pathways and upcoming mission content.</div></div><span>→</span></Link>
          </div>
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
                    <div><strong>{String(item.name)}</strong><div className="muted">{String(item.organization_name)} · {String(item.class_scope) === "teacher_custom" ? "My Classroom" : "Program"} · {String(item.subject_label || item.level_label || "Level not set")}</div></div>
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

        {roster.length > 0 && <section className="panel">
          <div className="eyebrow">Parent / guardian reporting</div>
          <h2 className="workspaceTitle">Bilingual evidence reports</h2>
          <p className="muted">Reports are generated only when the learner has an active guardian-reporting consent record for the institution.</p>
          <div className="workspaceList">
            {roster.map((student) => <div className="workspaceRow" key={String(student.id)}>
              <strong>{String(student.semantic_id)}</strong>
              <Link className="button soft" href={`/workspace/teacher/learner/${String(student.id)}/report`}>Open report</Link>
            </div>)}
          </div>
        </section>}

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
                {recentSubmissions.map((item) => {
                  const response = item.response && typeof item.response === "object"
                    ? item.response as Record<string, unknown>
                    : {};
                  const status = String(item.status);
                  return (
                    <div className="feedbackCard" key={String(item.id)}>
                      <div className="workspaceRow" style={{ padding: 0 }}>
                        <div>
                          <strong>{String(item.title_en)} · Revision {String(item.current_revision || 0)}</strong>
                          <div className="muted">{String(item.class_name)} · {String(item.learner_semantic_id)}</div>
                        </div>
                        <span className="pill">{status.replace("_", " ")}</span>
                      </div>
                      <p style={{ whiteSpace: "pre-wrap" }}>{String(response.text || "No text response.")}</p>
                      {status === "submitted" ? (
                        <form action={reviewSubmission} className="workspaceForm">
                          <input type="hidden" name="submissionId" value={String(item.id)} />
                          <textarea name="feedbackText" maxLength={4000} rows={3} placeholder="Specific feedback for this revision" required />
                          <label><span>Score (optional)</span><input name="score" type="number" min="0" max="100" step="0.5" /></label>
                          <div className="actions">
                            <button className="button soft" type="submit" name="decision" value="return">Return for revision</button>
                            <button className="button primary" type="submit" name="decision" value="verify">Verify / close</button>
                          </div>
                        </form>
                      ) : (
                        <p className="muted">{status === "returned" ? "Waiting for the learner to revise and resubmit." : "This assignment is closed."}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

function WorkspaceGate({ title, copy, signedIn = false }: { title: string; copy: string; signedIn?: boolean }) {
  return <main className="workspacePage"><WorkspaceHeader title={title} subtitle="Role-protected workspace" /><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Access not assigned" : "Sign in required"}</h2><p className="muted">{copy}</p><div className="actions"><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace")}`}>Sign in</Link><Link className="button" href="/portal/teacher">View public teacher preview</Link></div></section></div></main>;
}

function WorkspaceHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><div><strong>{title}</strong><div className="muted" style={{ fontSize: 12 }}>{subtitle}</div></div><div className="actions"><Link className="pill" href="/workspace/teacher/my-classroom">My Classroom</Link><Link className="pill" href="/workspace/teacher/assessments">Assessments</Link><Link className="pill" href="/workspace/teacher/community">Community</Link><Link className="pill" href="/workspace/teacher/upskill">Upskill</Link></div></header>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="metric"><span className="muted">{label}</span><strong>{value}</strong><span className="muted">{detail}</span></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>;
}
