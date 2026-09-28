import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlatformAdminContext } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { buildActivityContract, learnerActivityContract } from "@/lib/learning/activity-contract";
import { qaApprovalAllowed, qaContractChecks } from "@/lib/qa/curriculum-qa-policy";
import CurriculumQaTester from "../CurriculumQaTester";
import { updateActivityQa } from "../actions";

export const dynamic = "force-dynamic";

export default async function CurriculumQaDetailPage({params}:{params:Promise<{activityId:string}>}) {
  const admin=await getPlatformAdminContext();
  if(!admin) notFound();
  const {activityId}=await params;
  const sql=getDb();
  const rows=await sql`
    select
      a.id, a.code, a.activity_type, a.title_en, a.title_vi, a.content,
      a.content_version, a.max_score, a.instructions_en, a.instructions_vi,
      a.qa_status, a.qa_notes, a.qa_reviewed_at,
      b.code as book_code, b.title_en as book_title, b.age_band, b.level_label,
      bu.code as unit_code, bu.title_en as unit_title,
      bu.objective_en, bu.objective_vi
    from activities a
    join book_units bu on bu.id=a.unit_id
    join books b on b.id=bu.book_id
    where a.id=${activityId}
    limit 1
  `;
  const row=rows[0];
  if(!row) notFound();

  const contract=buildActivityContract({
    activityId:String(row.id), activityCode:String(row.code),
    courseId:String(row.book_code), unitId:String(row.unit_code),
    activityType:String(row.activity_type), contentVersion:Number(row.content_version||1),
    ageBand:row.age_band?String(row.age_band):null,
    englishLevel:row.level_label?String(row.level_label):null,
    objectiveEn:row.objective_en?String(row.objective_en):null,
    objectiveVi:row.objective_vi?String(row.objective_vi):null,
    instructionsEn:row.instructions_en?String(row.instructions_en):null,
    instructionsVi:row.instructions_vi?String(row.instructions_vi):null,
    content:row.content,
  });
  const safe=learnerActivityContract(contract,null).activity;
  const checks=qaContractChecks(contract);
  const requiresAnswer=["single_choice","sequence","matching"].includes(contract.inputType);
  const approvalReady=qaApprovalAllowed(checks,requiresAnswer);

  return <main className="workspacePage">
    <header className="topbar"><Link className="brand" href="/workspace/admin/curriculum-qa">Curriculum QA</Link><strong>{String(row.code)} · v{contract.contentVersion}</strong><Link className="pill" href="/workspace/admin">Admin</Link></header>
    <div className="workspaceContent">
      <section className="workspaceIdentity">
        <div><div className="eyebrow">{String(row.book_code)} · {String(row.unit_code)}</div><h1 className="workspaceHeroTitle">{String(row.title_en)}</h1><p className="muted">{String(row.title_vi)}</p></div>
        <span className="pill">{String(row.qa_status)}</span>
      </section>

      <section className="workspaceGrid">
        <article className="panel">
          <div className="eyebrow">Learner contract</div>
          <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(safe,null,2)}</pre>
        </article>
        <article className="panel">
          <div className="eyebrow">Reviewer-only answer / rubric</div>
          <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify({
            answerDefinition:contract.answerDefinition,
            rubricDefinition:contract.rubricDefinition,
            feedbackRules:contract.feedbackRules,
            completionRule:contract.completionRule,
            evidencePolicy:contract.evidencePolicy,
          },null,2)}</pre>
        </article>
      </section>

      <CurriculumQaTester activityId={String(row.id)} activityCode={String(row.code)} inputType={contract.inputType} content={safe.content} />

      <section className="panel">
        <div className="eyebrow">QA decision</div>
        <p className="muted">{approvalReady?"Required contract fields are complete.":"Approval is blocked until required metadata/answer fields are complete."}</p>
        <form action={updateActivityQa} className="workspaceForm">
          <input type="hidden" name="activityId" value={String(row.id)} />
          <label><span>Reviewer notes</span><textarea name="notes" rows={4} maxLength={3000} defaultValue={String(row.qa_notes||"")} /></label>
          <div className="actions">
            <button className="button" name="status" value="in_review">In review</button>
            <button className="button" name="status" value="needs_changes">Needs changes</button>
            <button className="button primary" name="status" value="approved" disabled={!approvalReady}>Approve activity</button>
          </div>
        </form>
      </section>
    </div>
  </main>;
}
