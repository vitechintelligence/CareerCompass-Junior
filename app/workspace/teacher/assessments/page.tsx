import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { createAssessment, setAssessmentStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeacherAssessmentsPage() {
  const user = await getSessionUser();
  if (!user) return <Gate />;
  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) return <Gate signedIn />;

  const sql = getDb();
  const classes = profile.account_type === "platform_admin"
    ? await sql`
        select c.id, c.name, c.class_scope, c.subject_label, o.name as organization_name
        from classes c join organizations o on o.id=c.organization_id
        where c.status='active'
        order by c.class_scope desc, c.name
      `
    : await sql`
        select c.id, c.name, c.class_scope, c.subject_label, o.name as organization_name
        from teacher_assignments ta
        join classes c on c.id=ta.class_id
        join organizations o on o.id=c.organization_id
        where ta.teacher_id=${profile.id}
          and c.status='active'
        order by c.class_scope desc, c.name
      `;

  const assessments = classes.length === 0 ? [] : await sql`
    select a.id, a.class_id, a.title_en, a.title_vi, a.assessment_type, a.status, a.due_at, a.created_at,
           c.name as class_name, c.class_scope,
           count(distinct q.id)::int as question_count,
           count(distinct aa.id)::int as attempt_count,
           count(distinct aa.id) filter (where aa.status='submitted')::int as submitted_count
    from assessments a
    join classes c on c.id=a.class_id
    left join assessment_questions q on q.assessment_id=a.id
    left join assessment_attempts aa on aa.assessment_id=a.id
    where a.class_id = any(${classes.map((row) => String(row.id))}::uuid[])
    group by a.id, c.name, c.class_scope
    order by a.created_at desc
    limit 30
  `;

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>Quizzes & Exams</strong><div className="muted" style={{ fontSize: 12 }}>Deploy · student attempt · track · review</div></div>
        <div className="actions"><Link className="pill" href="/workspace/teacher">Dashboard</Link><Link className="pill" href="/workspace/teacher/my-classroom">My Classroom</Link></div>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">Assessment engine</div>
            <h1 className="workspaceHeroTitle">Deploy a quiz or exam directly to an assigned class.</h1>
            <p className="muted">Published assessments appear in the student workspace automatically. Multiple-choice and exact-answer questions can be auto-scored; results remain tied to the class and learner.</p>
          </div>
          <span className="pill">{assessments.length} assessments</span>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Create</div>
            <h2 className="workspaceTitle">New quiz / exam</h2>
            {classes.length === 0 ? <Empty text="You need an assigned class or My Classroom class first." /> : (
              <form action={createAssessment} className="workspaceForm">
                <label><span>Class</span><select name="classId">{classes.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name)} · {String(item.class_scope) === "teacher_custom" ? "My Classroom" : "Program"}</option>)}</select></label>
                <label><span>Type</span><select name="assessmentType" defaultValue="quiz"><option value="quiz">Quiz</option><option value="exam">Exam</option><option value="checkpoint">Checkpoint</option></select></label>
                <label><span>English title</span><input name="titleEn" maxLength={160} required /></label>
                <label><span>Vietnamese title</span><input name="titleVi" maxLength={160} required /></label>
                <label><span>English instructions</span><textarea name="instructionsEn" maxLength={3000} rows={2} /></label>
                <label><span>Vietnamese instructions</span><textarea name="instructionsVi" maxLength={3000} rows={2} /></label>
                <div className="inlineFields"><label><span>Due</span><input name="dueAt" type="datetime-local" /></label><label><span>Time limit (min)</span><input name="timeLimitMinutes" type="number" min="1" max="300" /></label></div>

                {[1,2,3,4,5].map((index) => (
                  <fieldset className="feedbackCard" key={index}>
                    <legend><strong>Question {index}</strong></legend>
                    <label><span>Type</span><select name={`q${index}Type`} defaultValue="multiple_choice"><option value="multiple_choice">Multiple choice</option><option value="short_text">Short text</option></select></label>
                    <label><span>English prompt</span><textarea name={`q${index}PromptEn`} rows={2} maxLength={1200} /></label>
                    <label><span>Vietnamese prompt</span><textarea name={`q${index}PromptVi`} rows={2} maxLength={1200} /></label>
                    <label><span>Options, separated by |</span><input name={`q${index}Options`} maxLength={2000} placeholder="A | B | C | D" /></label>
                    <div className="inlineFields"><label><span>Correct answer</span><input name={`q${index}Correct`} maxLength={500} /></label><label><span>Points</span><input name={`q${index}Points`} type="number" min="0" max="1000" step="0.5" defaultValue="1" /></label></div>
                  </fieldset>
                ))}
                <button className="button primary" type="submit">Publish to students</button>
              </form>
            )}
          </article>

          <article className="panel">
            <div className="eyebrow">Track</div>
            <h2 className="workspaceTitle">Assessment activity</h2>
            {assessments.length === 0 ? <Empty text="No quizzes or exams yet." /> : (
              <div className="workspaceList">
                {assessments.map((item) => (
                  <div className="feedbackCard" key={String(item.id)}>
                    <div className="workspaceRow">
                      <div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.class_name)} · {String(item.assessment_type)} · {String(item.question_count)} questions</div></div>
                      <span className="pill">{String(item.status)}</span>
                    </div>
                    <div className="miniGrid" style={{ marginTop: 10 }}>
                      <div className="miniCard light"><strong>{String(item.attempt_count)}</strong><span>attempts</span></div>
                      <div className="miniCard light"><strong>{String(item.submitted_count)}</strong><span>submitted</span></div>
                    </div>
                    <form action={setAssessmentStatus} className="actions" style={{ marginTop: 10 }}>
                      <input type="hidden" name="assessmentId" value={String(item.id)} />
                      {String(item.status) !== "published" && <button className="button soft" name="status" value="published" type="submit">Reopen</button>}
                      {String(item.status) === "published" && <button className="button" name="status" value="closed" type="submit">Close</button>}
                      <button className="button" name="status" value="archived" type="submit">Archive</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

function Gate({ signedIn = false }: { signedIn?: boolean }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Quizzes & Exams</strong></header><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Teacher access not assigned" : "Sign in required"}</h2><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/teacher/assessments")}`}>Sign in</Link></section></div></main>;
}
function Empty({ text }: { text: string }) { return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>; }
