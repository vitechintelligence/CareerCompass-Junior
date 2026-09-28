import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { learnerCanEditSubmission } from "@/lib/classroom/submission-policy";
import { saveAssignmentDraft, submitAssignmentRevision } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) notFound();
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active" || profile.account_type !== "student") notFound();

  const { assignmentId } = await params;
  const sql = getDb();
  const rows = await sql`
    select
      a.id, a.title_en, a.title_vi, a.instructions_en, a.instructions_vi, a.due_at,
      c.name as class_name,
      s.id as submission_id, s.response, s.status as submission_status,
      s.current_revision, s.submitted_at
    from assignments a
    join classes c on c.id=a.class_id and c.status='active'
    join organizations o on o.id=c.organization_id and o.status='active'
    join class_memberships cm
      on cm.class_id=c.id and cm.student_id=${profile.id} and cm.status='active'
    join organization_memberships om
      on om.organization_id=c.organization_id
     and om.profile_id=${profile.id}
     and om.role='student'
     and om.status='active'
    left join submissions s
      on s.assignment_id=a.id and s.student_id=${profile.id}
    where a.id=${assignmentId}
      and a.status='published'
    limit 1
  `;
  const assignment = rows[0] as Record<string, unknown> | undefined;
  if (!assignment) notFound();

  const submissionId = assignment.submission_id ? String(assignment.submission_id) : null;
  const revisions = submissionId ? await sql`
    select id, revision_number, response, submitted_at
    from submission_revisions
    where submission_id=${submissionId}
    order by revision_number desc
  ` : [];
  const feedback = submissionId ? await sql`
    select tf.id, tf.feedback_text, tf.score, tf.created_at,
           sr.revision_number, p.display_name as teacher_name
    from teacher_feedback tf
    left join submission_revisions sr on sr.id=tf.submission_revision_id
    left join profiles p on p.id=tf.teacher_id
    where tf.submission_id=${submissionId}
      and tf.visibility='student'
    order by tf.created_at desc
  ` : [];

  const status = assignment.submission_status
    ? String(assignment.submission_status) as "draft" | "submitted" | "returned" | "accepted"
    : null;
  const editable = learnerCanEditSubmission(status);
  const currentResponse = assignment.response && typeof assignment.response === "object"
    ? assignment.response as Record<string, unknown>
    : {};
  const currentText = typeof currentResponse.text === "string" ? currentResponse.text : "";

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/workspace/student">Career Compass Junior</Link>
        <div><strong>Assignment</strong><div className="muted" style={{ fontSize: 12 }}>{String(assignment.class_name)}</div></div>
        <Link className="pill" href="/workspace/student">My Compass</Link>
      </header>
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">{status ? status.replace("_", " ") : "not started"}</div>
            <h1 className="workspaceHeroTitle">{String(assignment.title_en)}</h1>
            <p className="muted">{String(assignment.title_vi)}</p>
          </div>
          <span className="pill">Revision {String(assignment.current_revision || 0)}</span>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Instructions</div>
            <p>{String(assignment.instructions_en || "Complete the assignment and submit your best work.")}</p>
            {typeof assignment.instructions_vi === "string" && assignment.instructions_vi.length > 0 && <p className="muted">{assignment.instructions_vi}</p>}
            {assignment.due_at != null && <p className="muted">Due {new Date(String(assignment.due_at)).toLocaleString("en-GB")}</p>}
          </article>
          <article className="panel">
            <div className="eyebrow">Current state</div>
            <h2 className="workspaceTitle">{status === "accepted" ? "Verified / closed" : status === "submitted" ? "Waiting for teacher review" : status === "returned" ? "Revision requested" : "Work in progress"}</h2>
            <p className="muted">
              {status === "submitted" && "Your submitted revision is locked until the teacher reviews it."}
              {status === "returned" && "Read the feedback, improve your work, then resubmit."}
              {status === "accepted" && "The teacher verified this assignment. Your submitted revision is preserved."}
              {(!status || status === "draft") && "Save a draft as you work. Drafts do not count as submitted evidence."}
            </p>
          </article>
        </section>

        <section className="panel">
          <div className="eyebrow">Your response</div>
          {editable ? (
            <form className="workspaceForm">
              <input type="hidden" name="assignmentId" value={assignmentId} />
              <input type="hidden" name="submissionKey" value={randomUUID()} />
              <textarea name="response" rows={12} maxLength={12000} defaultValue={currentText} required />
              <div className="actions">
                <button className="button soft" type="submit" formAction={saveAssignmentDraft}>Save draft</button>
                <button className="button primary" type="submit" formAction={submitAssignmentRevision}>Submit revision</button>
              </div>
            </form>
          ) : (
            <div className="feedbackCard"><p style={{ whiteSpace: "pre-wrap" }}>{currentText || "No text response."}</p></div>
          )}
        </section>

        {feedback.length > 0 && <section className="panel">
          <div className="eyebrow">Teacher feedback</div>
          <h2 className="workspaceTitle">Improve from feedback</h2>
          <div className="workspaceList">
            {feedback.map((item) => (
              <div className="feedbackCard" key={String(item.id)}>
                <strong>Revision {String(item.revision_number || assignment.current_revision || "")}{item.score != null ? ` · ${String(item.score)}/100` : ""}</strong>
                <p style={{ whiteSpace: "pre-wrap" }}>{String(item.feedback_text || "")}</p>
                <div className="muted">{String(item.teacher_name || "Teacher")} · {new Date(String(item.created_at)).toLocaleString("en-GB")}</div>
              </div>
            ))}
          </div>
        </section>}

        {revisions.length > 0 && <section className="panel">
          <div className="eyebrow">Revision history</div>
          <div className="workspaceList">
            {revisions.map((item) => {
              const response = item.response && typeof item.response === "object"
                ? item.response as Record<string, unknown>
                : {};
              return <div className="feedbackCard" key={String(item.id)}>
                <strong>Revision {String(item.revision_number)}</strong>
                <p style={{ whiteSpace: "pre-wrap" }}>{String(response.text || "")}</p>
                <div className="muted">{new Date(String(item.submitted_at)).toLocaleString("en-GB")}</div>
              </div>;
            })}
          </div>
        </section>}
      </div>
    </main>
  );
}
