import Link from "next/link";
import { notFound } from "next/navigation";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { submitAssessment } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentAssessmentPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  const user = await getSessionUser();
  if (!user) return <Gate assessmentId={assessmentId} />;
  const profile = await getCurrentProfile();
  if (!profile || profile.account_type !== "student") return <Gate assessmentId={assessmentId} signedIn />;

  const sql = getDb();
  const rows = await sql`
    select a.id, a.class_id, a.assessment_type, a.title_en, a.title_vi, a.instructions_en, a.instructions_vi,
           a.status, a.due_at, a.time_limit_minutes, a.max_attempts, c.name as class_name
    from assessments a
    join classes c on c.id=a.class_id
    join class_memberships cm on cm.class_id=a.class_id
    where a.id=${assessmentId}
      and cm.student_id=${profile.id}
      and cm.status='active'
    limit 1
  `;
  const assessment = rows[0];
  if (!assessment) notFound();

  const questions = await sql`
    select id, sort_order, question_type, prompt_en, prompt_vi, options, points
    from assessment_questions
    where assessment_id=${assessmentId}
    order by sort_order, id
  `;
  const attempts = await sql`
    select id, attempt_number, status, score, max_score, submitted_at
    from assessment_attempts
    where assessment_id=${assessmentId} and student_id=${profile.id}
    order by attempt_number desc
  `;
  const vi = profile.preferred_locale === "vi";
  const canAttempt = String(assessment.status) === "published" && attempts.length < Number(assessment.max_attempts || 1);

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>{vi ? "Bài kiểm tra" : "Assessment"}</strong><div className="muted" style={{ fontSize: 12 }}>{String(assessment.class_name)}</div></div>
        <Link className="pill" href="/workspace/student">{vi ? "Quay lại" : "Back to dashboard"}</Link>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">{String(assessment.assessment_type)}</div>
            <h1 className="workspaceHeroTitle">{vi ? String(assessment.title_vi) : String(assessment.title_en)}</h1>
            <p className="muted">{vi ? String(assessment.instructions_vi || "") : String(assessment.instructions_en || "")}</p>
          </div>
          <div className="actions">
            {assessment.time_limit_minutes && <span className="pill">{String(assessment.time_limit_minutes)} min</span>}
            {assessment.due_at && <span className="pill">{vi ? "Hạn" : "Due"} {new Date(String(assessment.due_at)).toLocaleString("en-GB")}</span>}
          </div>
        </section>

        {attempts.length > 0 && (
          <section className="panel">
            <div className="eyebrow">{vi ? "Lần làm trước" : "Previous attempts"}</div>
            <div className="workspaceList">
              {attempts.map((attempt) => (
                <div className="workspaceRow" key={String(attempt.id)}>
                  <div><strong>{vi ? "Lần" : "Attempt"} {String(attempt.attempt_number)}</strong><div className="muted">{String(attempt.status)} · {attempt.submitted_at ? new Date(String(attempt.submitted_at)).toLocaleString("en-GB") : ""}</div></div>
                  <span className="pill">{attempt.max_score ? `${String(attempt.score ?? 0)} / ${String(attempt.max_score)}` : String(attempt.status)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel">
          <div className="eyebrow">{vi ? "Câu hỏi" : "Questions"}</div>
          {!canAttempt ? (
            <div className="emptyState"><span>✓</span><p className="muted">{vi ? "Bài kiểm tra hiện không nhận thêm lượt làm." : "This assessment is not accepting another attempt."}</p></div>
          ) : (
            <form action={submitAssessment} className="workspaceForm">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              {questions.map((question, index) => {
                const options = Array.isArray(question.options) ? question.options.map(String) : [];
                return (
                  <fieldset className="feedbackCard" key={String(question.id)}>
                    <legend><strong>{index + 1}. {vi ? String(question.prompt_vi) : String(question.prompt_en)} · {String(question.points)} pts</strong></legend>
                    {String(question.question_type) === "multiple_choice" ? (
                      <div className="workspaceForm">
                        {options.map((option) => <label key={option}><span><input type="radio" name={`q_${String(question.id)}`} value={option} required /> {option}</span></label>)}
                      </div>
                    ) : (
                      <textarea name={`q_${String(question.id)}`} rows={3} maxLength={5000} required />
                    )}
                  </fieldset>
                );
              })}
              <button className="button primary" type="submit">{vi ? "Nộp bài" : "Submit assessment"}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function Gate({ assessmentId, signedIn = false }: { assessmentId: string; signedIn?: boolean }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Assessment</strong></header><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Student access required" : "Sign in required"}</h2><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent(`/workspace/student/assessment/${assessmentId}`)}`}>Sign in</Link></section></div></main>;
}
