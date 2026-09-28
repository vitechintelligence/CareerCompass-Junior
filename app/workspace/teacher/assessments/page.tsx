import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { createAssessment, reviewAssessmentAttempt, setAssessmentStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeacherAssessmentsPage() {
  const user = await getSessionUser();
  if (!user) return <Gate />;
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active" || !["teacher", "platform_admin"].includes(profile.account_type)) return <Gate signedIn />;

  const sql = getDb();
  const classes = profile.account_type === "platform_admin"
    ? await sql`
        select c.id, c.name, c.class_scope, c.subject_label, o.name as organization_name
        from classes c join organizations o on o.id=c.organization_id and o.status='active'
        where c.status='active'
        order by c.class_scope desc, c.name
      `
    : await sql`
        select c.id, c.name, c.class_scope, c.subject_label, o.name as organization_name
        from teacher_assignments ta
        join classes c on c.id=ta.class_id
        join organizations o on o.id=c.organization_id and o.status='active'
        join organization_memberships om
          on om.organization_id=c.organization_id
         and om.profile_id=ta.teacher_id
         and om.role='teacher'
         and om.status='active'
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

  const pendingReviews = classes.length === 0 ? [] : await sql`
    select
      aa.id as attempt_id, aa.submitted_at,
      a.title_en, a.title_vi, c.name as class_name,
      p.semantic_id as learner_semantic_id,
      jsonb_agg(
        jsonb_build_object(
          'answerId', ans.id,
          'answerText', ans.answer_text,
          'autoCorrect', ans.auto_correct,
          'awardedPoints', ans.awarded_points,
          'promptEn', q.prompt_en,
          'promptVi', q.prompt_vi,
          'points', q.points,
          'objectiveEn', q.learning_objective_en,
          'objectiveVi', q.learning_objective_vi,
          'rubric', q.rubric
        )
        order by q.sort_order, q.id
      ) as answers
    from assessment_attempts aa
    join assessments a on a.id=aa.assessment_id
    join classes c on c.id=a.class_id
    join profiles p on p.id=aa.student_id
    join assessment_answers ans on ans.attempt_id=aa.id
    join assessment_questions q on q.id=ans.question_id
    where aa.status='submitted'
      and a.class_id=any(${classes.map((row) => String(row.id))}::uuid[])
    group by aa.id, a.title_en, a.title_vi, c.name, p.semantic_id
    order by aa.submitted_at asc
    limit 20
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

        {pendingReviews.length > 0 && <section className="panel">
          <div className="eyebrow">Needs review</div>
          <h2 className="workspaceTitle">Rubric-review open responses</h2>
          <p className="muted">Award points within each question maximum, leave actionable feedback, and verify evidence only when you have actually reviewed the learner response.</p>
          <div className="workspaceList">
            {pendingReviews.map((attempt) => {
              const answers = Array.isArray(attempt.answers)
                ? attempt.answers as Array<Record<string, unknown>>
                : [];
              return <form action={reviewAssessmentAttempt} className="feedbackCard" key={String(attempt.attempt_id)}>
                <input type="hidden" name="attemptId" value={String(attempt.attempt_id)} />
                <strong>{String(attempt.title_en)}</strong>
                <div className="muted">{String(attempt.class_name)} · {String(attempt.learner_semantic_id)}</div>
                {answers.map((answer, index) => {
                  const rubric = answer.rubric && typeof answer.rubric === "object"
                    ? answer.rubric as Record<string, unknown>
                    : {};
                  const manual = answer.autoCorrect == null;
                  return <div className="miniCard light" key={String(answer.answerId)}>
                    <strong>{index + 1}. {String(answer.promptEn || "")}</strong>
                    {typeof answer.objectiveEn === "string" && answer.objectiveEn.length > 0 && <div className="muted">Objective: {answer.objectiveEn}</div>}
                    {typeof rubric.guidance === "string" && rubric.guidance.length > 0 && <div className="muted">Rubric: {rubric.guidance}</div>}
                    <p style={{ whiteSpace: "pre-wrap" }}>{String(answer.answerText || "")}</p>
                    {manual ? (
                      <label><span>Points / {String(answer.points)}</span><input name={`points_${String(answer.answerId)}`} type="number" min="0" max={Number(answer.points || 0)} step="0.5" required /></label>
                    ) : (
                      <span className="pill">Auto-scored {String(answer.awardedPoints || 0)} / {String(answer.points)}</span>
                    )}
                  </div>;
                })}
                <label><span>Feedback</span><textarea name="feedback" rows={3} maxLength={4000} required /></label>
                <label><span><input type="checkbox" name="verifyEvidence" value="yes" /> Verify this reviewed assessment as evidence</span></label>
                <button className="button primary" type="submit">Complete review</button>
              </form>;
            })}
          </div>
        </section>}

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
                <label><span>Demonstrated threshold (%)</span><input name="demonstratedThreshold" type="number" min="0" max="100" step="1" defaultValue="70" /></label>

                {[1,2,3,4,5].map((index) => (
                  <fieldset className="feedbackCard" key={index}>
                    <legend><strong>Question {index}</strong></legend>
                    <label><span>Type</span><select name={`q${index}Type`} defaultValue="multiple_choice"><option value="multiple_choice">Multiple choice</option><option value="short_text">Short text</option></select></label>
                    <label><span>English prompt</span><textarea name={`q${index}PromptEn`} rows={2} maxLength={1200} /></label>
                    <label><span>Vietnamese prompt</span><textarea name={`q${index}PromptVi`} rows={2} maxLength={1200} /></label>
                    <label><span>Options, separated by |</span><input name={`q${index}Options`} maxLength={2000} placeholder="A | B | C | D" /></label>
                    <label><span>Learning objective (EN)</span><input name={`q${index}ObjectiveEn`} maxLength={800} /></label>
                    <label><span>Learning objective (VI)</span><input name={`q${index}ObjectiveVi`} maxLength={800} /></label>
                    <label><span>Rubric / review guidance</span><textarea name={`q${index}Rubric`} rows={2} maxLength={1600} placeholder="What should a strong answer show?" /></label>
                    <div className="inlineFields"><label><span>Correct answer</span><input name={`q${index}Correct`} maxLength={500} /></label><label><span>Points</span><input name={`q${index}Points`} type="number" min="0" max="1000" step="0.5" defaultValue="1" /></label></div>
                  </fieldset>
                ))}
                <button className="button primary" type="submit">Save validated draft</button>
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
                      {String(item.status) === "draft" && <button className="button soft" name="status" value="published" type="submit">Publish</button>}
                      {String(item.status) === "closed" && <button className="button soft" name="status" value="published" type="submit">Reopen</button>}
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
