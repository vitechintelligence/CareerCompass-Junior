import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { requireTeacherClassAccess } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LearnerParentReportPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) notFound();
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active" || !["teacher", "platform_admin"].includes(profile.account_type)) notFound();

  const { studentId } = await params;
  const sql = getDb();
  const scopes = await sql`
    select c.id as class_id, c.name as class_name, c.organization_id, o.name as organization_name,
           p.semantic_id, p.display_name
    from class_memberships cm
    join classes c on c.id=cm.class_id and c.status='active'
    join organizations o on o.id=c.organization_id and o.status='active'
    join profiles p on p.id=cm.student_id and p.status='active'
    where cm.student_id=${studentId}
      and cm.status='active'
    order by c.updated_at desc
    limit 20
  `;
  let scope: Record<string, unknown> | null = null;
  for (const candidate of scopes) {
    try {
      await requireTeacherClassAccess(String(candidate.class_id), profile);
      scope = candidate as Record<string, unknown>;
      break;
    } catch {
      // Keep checking the teacher's other authorized classes without leaking them.
    }
  }
  if (!scope) notFound();

  const consent = await sql`
    select id
    from learner_consent_records
    where learner_id=${studentId}
      and organization_id=${String(scope.organization_id)}
      and consent_type='guardian_reporting'
      and status='active'
      and guardian_confirmation=true
      and revoked_at is null
    order by captured_at desc
    limit 1
  `;
  if (!consent[0]) {
    return <main className="workspacePage">
      <header className="topbar"><Link className="brand" href="/workspace/teacher">Career Compass Junior</Link><strong>Parent / Guardian Report</strong></header>
      <div className="workspaceContent"><section className="panel gatePanel">
        <h1>Guardian reporting is not active.</h1>
        <p className="muted">This institution-scoped learner report stays unavailable until an active guardian-reporting consent record exists. No report data was rendered.</p>
        <Link className="button" href="/workspace/teacher">Back to Teacher Workspace</Link>
      </section></div>
    </main>;
  }

  const [practiced, demonstrated, improvements, nextWork] = await Promise.all([
    sql`
      select distinct on (a.id)
        a.title_en, a.title_vi, aa.completion_status, aa.submitted_at
      from activity_attempts aa
      join activities a on a.id=aa.activity_id
      join book_units bu on bu.id=a.unit_id
      join student_enrollments se on se.id=aa.enrollment_id
      where aa.student_id=${studentId}
        and se.class_id=${String(scope.class_id)}
      order by a.id, aa.submitted_at desc
      limit 12
    `,
    sql`
      select title_en, title_vi, mastery_level, status, achieved_on, evidence_summary
      from learning_capsules
      where learner_id=${studentId}
        and class_id=${String(scope.class_id)}
        and mastery_level in ('demonstrated','verified')
        and status in ('draft','verified','released')
      order by achieved_on desc nulls last, created_at desc
      limit 12
    `,
    sql`
      select a.title_en, a.title_vi, s.current_revision, s.status,
             tf.feedback_text, tf.score, tf.created_at
      from submissions s
      join assignments a on a.id=s.assignment_id
      left join lateral (
        select feedback_text, score, created_at
        from teacher_feedback
        where submission_id=s.id and visibility='student'
        order by created_at desc
        limit 1
      ) tf on true
      where s.student_id=${studentId}
        and a.class_id=${String(scope.class_id)}
        and s.current_revision > 1
      order by s.updated_at desc
      limit 8
    `,
    sql`
      select a.title_en, a.title_vi, s.status, a.due_at
      from assignments a
      join class_memberships cm
        on cm.class_id=a.class_id and cm.student_id=${studentId} and cm.status='active'
      left join submissions s
        on s.assignment_id=a.id and s.student_id=${studentId}
      where a.class_id=${String(scope.class_id)}
        and a.status='published'
        and (s.id is null or s.status in ('draft','returned'))
      order by a.due_at asc nulls last, a.created_at desc
      limit 8
    `,
  ]);

  const learnerName = String(scope.display_name || scope.semantic_id || "Learner");
  const atHomeEn = nextWork.length > 0
    ? "Ask the learner to explain one unfinished task in their own words, then make one small improvement before checking the answer together."
    : "Ask the learner to explain one thing they learned this week, create a small example, then improve it after your feedback.";
  const atHomeVi = nextWork.length > 0
    ? "Hãy yêu cầu học sinh tự giải thích một nhiệm vụ chưa hoàn thành, sau đó cải thiện một chi tiết nhỏ trước khi cùng kiểm tra đáp án."
    : "Hãy yêu cầu học sinh giải thích một điều đã học trong tuần, tạo một ví dụ nhỏ, rồi cải thiện ví dụ sau khi nhận góp ý.";

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/workspace/teacher">Career Compass Junior</Link>
        <div><strong>Parent / Guardian Report</strong><div className="muted" style={{ fontSize: 12 }}>Bilingual learning evidence summary</div></div>
        <Link className="pill" href="/workspace/teacher">Teacher Workspace</Link>
      </header>
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">{String(scope.organization_name)} · {String(scope.class_name)}</div>
            <h1 className="workspaceHeroTitle">{learnerName}</h1>
            <p className="muted">This report summarizes recorded learning evidence. It does not infer mastery from page views or unreviewed drafts.</p>
          </div>
          <span className="pill">{new Date().toLocaleDateString("en-GB")}</span>
        </section>

        <ReportSection title="What was practiced · Nội dung đã luyện tập">
          {practiced.length === 0 ? <p className="muted">No recorded practice yet. · Chưa có dữ liệu luyện tập.</p> : practiced.map((item) => <div className="workspaceRow" key={String(item.title_en)}><div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.title_vi)}</div></div><span className="pill">{String(item.completion_status)}</span></div>)}
        </ReportSection>

        <ReportSection title="What was demonstrated / verified · Nội dung đã thể hiện / xác minh">
          {demonstrated.length === 0 ? <p className="muted">No demonstrated or verified evidence yet. · Chưa có minh chứng đạt mức thể hiện hoặc xác minh.</p> : demonstrated.map((item, index) => <div className="workspaceRow" key={`${String(item.title_en)}-${index}`}><div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.title_vi)}</div></div><span className="pill">{String(item.mastery_level)}</span></div>)}
        </ReportSection>

        <ReportSection title="What improved · Nội dung đã cải thiện">
          {improvements.length === 0 ? <p className="muted">No multi-revision assignment evidence yet. · Chưa có bài tập nhiều phiên bản để thể hiện sự cải thiện.</p> : improvements.map((item, index) => <div className="feedbackCard" key={`${String(item.title_en)}-${index}`}><strong>{String(item.title_en)} · Revision {String(item.current_revision)}</strong><div className="muted">{String(item.title_vi)}</div>{item.feedback_text && <p>{String(item.feedback_text)}</p>}</div>)}
        </ReportSection>

        <ReportSection title="What to work on next · Nội dung cần tiếp tục">
          {nextWork.length === 0 ? <p className="muted">No returned or unfinished class assignments are currently recorded. · Hiện không có bài tập bị trả lại hoặc chưa hoàn thành.</p> : nextWork.map((item, index) => <div className="workspaceRow" key={`${String(item.title_en)}-${index}`}><div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.title_vi)}</div></div><span className="pill">{String(item.status || "not started")}</span></div>)}
        </ReportSection>

        <section className="panel">
          <div className="eyebrow">Try this at home · Gợi ý tại nhà</div>
          <p>{atHomeEn}</p>
          <p className="muted">{atHomeVi}</p>
        </section>

        <section className="panel">
          <p className="muted">For a printable copy, use your browser’s Print / Save as PDF command. Guardian-reporting consent is checked again every time this page is opened.</p>
        </section>
      </div>
    </main>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel"><div className="eyebrow">{title}</div><div className="workspaceList" style={{ marginTop: 12 }}>{children}</div></section>;
}
