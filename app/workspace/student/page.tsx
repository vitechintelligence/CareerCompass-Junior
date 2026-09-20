import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StudentWorkspacePage() {
  const user = await getSessionUser();
  if (!user) return <StudentGate signedIn={false} />;

  const profile = await getCurrentProfile();
  if (!profile || profile.account_type !== "student") return <StudentGate signedIn />;

  const sql = getDb();
  const enrollments = await sql`
    select se.id, se.status, b.code, b.title_en, b.title_vi, b.level_label, b.age_band,
      c.name as class_name,
      coalesce(round(avg(bp.completion_percent)::numeric, 0), 0)::int as progress_percent
    from student_enrollments se
    join books b on b.id = se.book_id
    left join classes c on c.id = se.class_id
    left join book_progress bp on bp.enrollment_id = se.id
    where se.student_id = ${profile.id}
      and se.status in ('active','completed')
    group by se.id, b.id, c.name
    order by se.enrolled_at desc
  `;

  const assignments = await sql`
    select a.id, a.title_en, a.title_vi, a.due_at, c.name as class_name,
      coalesce(s.status, 'not_started') as submission_status
    from class_memberships cm
    join classes c on c.id = cm.class_id
    join assignments a on a.class_id = c.id and a.status = 'published'
    left join submissions s on s.assignment_id = a.id and s.student_id = ${profile.id}
    where cm.student_id = ${profile.id}
      and cm.status = 'active'
      and c.status = 'active'
    order by a.due_at asc nulls last, a.created_at desc
    limit 8
  `;

  const assessments = await sql`
    select a.id, a.title_en, a.title_vi, a.assessment_type, a.due_at, c.name as class_name,
           (select max(aa.attempt_number)::int from assessment_attempts aa where aa.assessment_id=a.id and aa.student_id=${profile.id}) as last_attempt,
           (select max(aa.score) from assessment_attempts aa where aa.assessment_id=a.id and aa.student_id=${profile.id}) as best_score,
           (select max(aa.max_score) from assessment_attempts aa where aa.assessment_id=a.id and aa.student_id=${profile.id}) as max_score
    from class_memberships cm
    join classes c on c.id=cm.class_id
    join assessments a on a.class_id=c.id and a.status='published'
    where cm.student_id=${profile.id}
      and cm.status='active'
      and c.status='active'
    order by a.due_at asc nulls last, a.created_at desc
    limit 8
  `;
  const capsules = await sql`
    select id, title_en, title_vi, status, mastery_level, achieved_on, created_at
    from learning_capsules
    where learner_id = ${profile.id}
      and status in ('draft','verified','released')
    order by achieved_on desc nulls last, created_at desc
    limit 8
  `;

  const announcements = await sql`
    select distinct a.id, a.title_en, a.body_en, a.published_at
    from announcements a
    left join class_memberships cm on cm.class_id = a.class_id and cm.student_id = ${profile.id} and cm.status='active'
    left join organization_memberships om on om.organization_id = a.organization_id and om.profile_id = ${profile.id} and om.status='active'
    where a.audience in ('all','students')
      and (cm.student_id is not null or om.profile_id is not null)
      and (a.expires_at is null or a.expires_at > now())
    order by a.published_at desc
    limit 5
  `;

  const resources = await sql`
    select distinct r.id, r.title_en, r.resource_type, r.resource_url
    from resources r
    left join class_memberships cm on cm.class_id = r.class_id and cm.student_id = ${profile.id} and cm.status='active'
    left join student_enrollments se on se.book_id = r.book_id and se.student_id = ${profile.id} and se.status in ('active','completed')
    left join organization_memberships om on om.organization_id = r.organization_id and om.profile_id = ${profile.id} and om.status='active'
    where r.visibility in ('all','students')
      and ((r.class_id is null and r.book_id is null and r.organization_id is null) or cm.student_id is not null or se.student_id is not null or om.profile_id is not null)
    order by r.created_at desc
    limit 6
  `;

  const averageProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, row) => sum + Number(row.progress_percent || 0), 0) / enrollments.length)
    : 0;
  const pendingAssignments = assignments.filter((row) => !["accepted", "returned"].includes(String(row.submission_status))).length;
  const pendingAssessments = assessments.filter((row) => !row.last_attempt).length;

  return (
    <main className="workspacePage">
      <StudentHeader />
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">My Compass</div>
            <h1 className="workspaceHeroTitle">Welcome back{profile.display_name ? `, ${String(profile.display_name)}` : ""}.</h1>
            <p className="muted">Your live learning space connects interactive books, class work, feedback and learning evidence.</p>
          </div>
          <span className="pill">{String(profile.semantic_id)}</span>
        </section>

        <section className="metricGrid">
          <Metric label="Book progress" value={`${averageProgress}%`} detail={`${enrollments.length} active book${enrollments.length === 1 ? "" : "s"}`} />
          <Metric label="Assignments" value={String(pendingAssignments)} detail="Pending / in progress" />
          <Metric label="Assessments" value={String(pendingAssessments)} detail="Quiz / exam waiting" />
          <Metric label="Learning evidence" value={String(capsules.length)} detail="Recent capsules" />
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Interactive books</div>
            <h2 className="workspaceTitle">Continue learning</h2>
            {enrollments.length === 0 ? (
              <EmptyState text="Your activated books will appear here after enrollment. You can still explore the public interactive book collection." actionHref="/books" actionLabel="Explore books" />
            ) : (
              <div className="workspaceList">
                {enrollments.map((item) => (
                  <div className="workspaceRow" key={String(item.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{String(item.title_en)}</strong>
                      <div className="muted" style={{ margin: "4px 0 8px" }}>{String(item.class_name || item.level_label || item.age_band || "Independent learning")}</div>
                      <div className="progressTrack"><div className="progressFill" style={{ width: `${Math.min(100, Math.max(0, Number(item.progress_percent || 0)))}%` }} /></div>
                    </div>
                    <Link className="button primary" href={`/learn/${encodeURIComponent(String(item.code))}`}>Open</Link>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="eyebrow">Class work</div>
            <h2 className="workspaceTitle">Assignments</h2>
            {assignments.length === 0 ? <EmptyState text="No published class assignments are waiting right now." /> : (
              <div className="workspaceList">
                {assignments.map((item) => (
                  <div className="workspaceRow" key={String(item.id)}>
                    <div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.class_name)}{item.due_at ? ` · due ${new Date(String(item.due_at)).toLocaleDateString("en-GB")}` : ""}</div></div>
                    <span className="pill">{String(item.submission_status).replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Quizzes & exams</div>
            <h2 className="workspaceTitle">Teacher assessments</h2>
            {assessments.length === 0 ? <EmptyState text="No published quizzes or exams are waiting right now." /> : (
              <div className="workspaceList">
                {assessments.map((item) => (
                  <div className="workspaceRow" key={String(item.id)}>
                    <div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.class_name)} · {String(item.assessment_type)}{item.due_at ? ` · due ${new Date(String(item.due_at)).toLocaleDateString("en-GB")}` : ""}</div></div>
                    <div className="actions">
                      {item.last_attempt ? <span className="pill">{item.max_score ? `${String(item.best_score ?? 0)} / ${String(item.max_score)}` : "submitted"}</span> : <span className="pill">new</span>}
                      <Link className="button soft" href={`/workspace/student/assessment/${String(item.id)}`}>Open</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="eyebrow">Learning evidence</div>
            <h2 className="workspaceTitle">My achievements</h2>
            {capsules.length === 0 ? <EmptyState text="Evidence-eligible activities will build your learning capsule here as you complete them." /> : (
              <div className="workspaceList">
                {capsules.map((item) => <div className="workspaceRow" key={String(item.id)}><div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.mastery_level || "Learning evidence")}</div></div><span className="pill">{String(item.status)}</span></div>)}
              </div>
            )}
          </article>

        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Class updates</div>
            <h2 className="workspaceTitle">Announcements</h2>
            {announcements.length === 0 ? <EmptyState text="No current announcements." /> : (
              <div className="workspaceList">{announcements.map((item) => <div className="feedbackCard" key={String(item.id)}><strong>{String(item.title_en)}</strong><p className="muted" style={{ margin: 0 }}>{String(item.body_en)}</p></div>)}</div>
            )}
          </article>
        </section>

        {resources.length > 0 && (
          <section className="panel">
            <div className="eyebrow">Resources</div><h2 className="workspaceTitle">Learning resources</h2>
            <div className="actionList">{resources.map((item) => <a className="actionItem" href={String(item.resource_url)} key={String(item.id)} target="_blank" rel="noreferrer"><div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.resource_type).replace("_", " ")}</div></div><span>↗</span></a>)}</div>
          </section>
        )}
      </div>
    </main>
  );
}

function StudentHeader() {
  return <header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><div><strong>Student Workspace</strong><div className="muted" style={{ fontSize: 12 }}>My Compass · live learning</div></div><div className="actions"><Link className="pill" href="/books">Books</Link><Link className="pill" href="/steam-lab">STEAM Lab</Link><Link className="pill" href="/workspace/student/community">Community</Link><Link className="pill" href="/workspace/student/industry">Companies & Careers</Link></div></header>;
}

function StudentGate({ signedIn }: { signedIn: boolean }) {
  return <main className="workspacePage"><StudentHeader /><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Student access required" : "Sign in to My Compass"}</h2><p className="muted">{signedIn ? "This account is not a student account. Teacher and partner accounts should use their assigned workspace." : "Sign in to connect your book progress, assignments, feedback and learning evidence."}</p><div className="actions">{!signedIn && <Link className="button primary" href="/auth/sign-in?callbackURL=%2Fworkspace%2Fstudent">Sign in</Link>}<Link className="button" href="/portal/student">View public preview</Link></div></section></div></main>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="metric"><span className="muted">{label}</span><strong>{value}</strong><span className="muted">{detail}</span></div>; }
function EmptyState({ text, actionHref, actionLabel }: { text: string; actionHref?: string; actionLabel?: string }) { return <div className="emptyState"><span>◎</span><p className="muted">{text}</p>{actionHref && actionLabel && <Link className="button soft" href={actionHref}>{actionLabel}</Link>}</div>; }
