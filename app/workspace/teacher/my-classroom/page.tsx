import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { addLearnerToTeacherClassroom, createTeacherClassroom } from "./actions";

export const dynamic = "force-dynamic";

export default async function MyClassroomPage() {
  const user = await getSessionUser();
  if (!user) return <Gate />;
  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) return <Gate signedIn />;

  const sql = getDb();
  const organizations = profile.account_type === "platform_admin"
    ? await sql`select id, name from organizations where status='active' order by name`
    : await sql`
        select o.id, o.name
        from organization_memberships om
        join organizations o on o.id=om.organization_id
        where om.profile_id=${profile.id}
          and om.role='teacher'
          and om.status='active'
          and o.status='active'
        order by o.name
      `;

  const classrooms = profile.account_type === "platform_admin"
    ? await sql`
        select c.id, c.name, c.subject_label, c.level_label, c.academic_cycle, o.name as organization_name,
               count(cm.student_id) filter (where cm.status='active')::int as student_count
        from classes c
        join organizations o on o.id=c.organization_id
        left join class_memberships cm on cm.class_id=c.id
        where c.class_scope='teacher_custom' and c.status='active'
        group by c.id, o.name
        order by c.name
      `
    : await sql`
        select c.id, c.name, c.subject_label, c.level_label, c.academic_cycle, o.name as organization_name,
               count(cm.student_id) filter (where cm.status='active')::int as student_count
        from classes c
        join organizations o on o.id=c.organization_id
        left join class_memberships cm on cm.class_id=c.id
        where c.class_scope='teacher_custom'
          and c.status='active'
          and c.owner_teacher_id=${profile.id}
        group by c.id, o.name
        order by c.name
      `;

  const assessments = classrooms.length === 0 ? [] : await sql`
    select a.id, a.class_id, a.title_en, a.assessment_type, a.status, a.due_at,
           count(aa.id)::int as attempt_count
    from assessments a
    left join assessment_attempts aa on aa.assessment_id=a.id
    where a.class_id = any(${classrooms.map((row) => String(row.id))}::uuid[])
    group by a.id
    order by a.created_at desc
    limit 12
  `;

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>My Classroom</strong><div className="muted" style={{ fontSize: 12 }}>Teacher-owned school classes · separate from ViTech program delivery</div></div>
        <div className="actions"><Link className="pill" href="/workspace/teacher">Teacher dashboard</Link><Link className="pill" href="/workspace/teacher/assessments">Quizzes & exams</Link></div>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">Teacher-owned space</div>
            <h1 className="workspaceHeroTitle">Manage your regular school classes without mixing them with ViTech programs.</h1>
            <p className="muted">Create subject classes, maintain a roster, track attendance through the teacher dashboard and deploy quizzes or exams to the same learners.</p>
          </div>
          <span className="pill">{classrooms.length} classrooms</span>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Create classroom</div>
            <h2 className="workspaceTitle">New My Classroom</h2>
            {organizations.length === 0 ? <Empty text="A teacher organization membership is required first." /> : (
              <form action={createTeacherClassroom} className="workspaceForm">
                <label><span>Institution</span><select name="organizationId">{organizations.map((org) => <option key={String(org.id)} value={String(org.id)}>{String(org.name)}</option>)}</select></label>
                <label><span>Classroom name</span><input name="name" maxLength={120} required placeholder="Grade 8 Science · 8A" /></label>
                <label><span>Subject</span><input name="subjectLabel" maxLength={100} placeholder="Science / English / Mathematics" /></label>
                <label><span>Grade / level</span><input name="levelLabel" maxLength={80} placeholder="Grade 8" /></label>
                <label><span>Academic cycle</span><input name="academicCycle" maxLength={40} placeholder="2026–2027" /></label>
                <button className="button primary" type="submit">Create My Classroom</button>
              </form>
            )}
          </article>

          <article className="panel">
            <div className="eyebrow">Quick view</div>
            <h2 className="workspaceTitle">My school classes</h2>
            {classrooms.length === 0 ? <Empty text="No teacher-owned classrooms yet." /> : (
              <div className="workspaceList">{classrooms.map((item) => (
                <div className="workspaceRow" key={String(item.id)}>
                  <div><strong>{String(item.name)}</strong><div className="muted">{String(item.organization_name)} · {String(item.subject_label || "Subject not set")} · {String(item.level_label || "Level not set")}</div></div>
                  <span className="pill">{String(item.student_count)} learners</span>
                </div>
              ))}</div>
            )}
          </article>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Roster</div>
            <h2 className="workspaceTitle">Add an enrolled learner</h2>
            {classrooms.length === 0 ? <Empty text="Create a classroom first." /> : (
              <form action={addLearnerToTeacherClassroom} className="workspaceForm">
                <label><span>Classroom</span><select name="classId">{classrooms.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name)}</option>)}</select></label>
                <label><span>Learner semantic ID</span><input name="studentSemanticId" maxLength={100} required placeholder="vn-learner-…" /></label>
                <button className="button soft" type="submit">Add to classroom</button>
              </form>
            )}
          </article>

          <article className="panel">
            <div className="eyebrow">Assessment pulse</div>
            <h2 className="workspaceTitle">Recent quizzes & exams</h2>
            {assessments.length === 0 ? <Empty text="No assessments have been deployed to My Classroom yet." /> : (
              <div className="workspaceList">{assessments.map((item) => (
                <div className="workspaceRow" key={String(item.id)}>
                  <div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.assessment_type)} · {String(item.status)}{item.due_at ? ` · due ${new Date(String(item.due_at)).toLocaleDateString("en-GB")}` : ""}</div></div>
                  <span className="pill">{String(item.attempt_count)} attempts</span>
                </div>
              ))}</div>
            )}
            <div className="actions" style={{ marginTop: 14 }}><Link className="button primary" href="/workspace/teacher/assessments">Deploy quiz / exam</Link></div>
          </article>
        </section>
      </div>
    </main>
  );
}

function Gate({ signedIn = false }: { signedIn?: boolean }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>My Classroom</strong></header><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Teacher access not assigned" : "Sign in required"}</h2><p className="muted">My Classroom is available to activated teacher accounts.</p><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/teacher/my-classroom")}`}>Sign in</Link></section></div></main>;
}
function Empty({ text }: { text: string }) { return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>; }
