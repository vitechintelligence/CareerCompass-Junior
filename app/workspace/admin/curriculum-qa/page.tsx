import Link from "next/link";
import { getPlatformAdminContext } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { buildActivityContract } from "@/lib/learning/activity-contract";
import { qaApprovalAllowed, qaContractChecks } from "@/lib/qa/curriculum-qa-policy";
import { updateActivityQa } from "./actions";

export const dynamic = "force-dynamic";

export default async function CurriculumQaPage() {
  const admin = await getPlatformAdminContext();
  if (!admin) return <Gate />;

  const sql = getDb();
  const rows = await sql`
    select
      a.id, a.code, a.activity_type, a.title_en, a.title_vi,
      a.content, a.content_version, a.instructions_en, a.instructions_vi,
      a.qa_status, a.qa_notes, a.qa_reviewed_at,
      b.code as book_code, b.title_en as book_title, b.age_band, b.level_label,
      bu.code as unit_code, bu.title_en as unit_title,
      bu.objective_en, bu.objective_vi
    from activities a
    join book_units bu on bu.id=a.unit_id
    join books b on b.id=bu.book_id
    order by
      case a.qa_status
        when 'needs_changes' then 0
        when 'unreviewed' then 1
        when 'in_review' then 2
        else 3
      end,
      b.code, bu.unit_number, a.sort_order, a.code
    limit 200
  `;

  const items = rows.map(row => {
    const contract=buildActivityContract({
      activityId:String(row.id),
      activityCode:String(row.code),
      courseId:String(row.book_code),
      unitId:String(row.unit_code),
      activityType:String(row.activity_type),
      contentVersion:Number(row.content_version||1),
      ageBand:row.age_band?String(row.age_band):null,
      englishLevel:row.level_label?String(row.level_label):null,
      objectiveEn:row.objective_en?String(row.objective_en):null,
      objectiveVi:row.objective_vi?String(row.objective_vi):null,
      instructionsEn:row.instructions_en?String(row.instructions_en):null,
      instructionsVi:row.instructions_vi?String(row.instructions_vi):null,
      content:row.content,
    });
    const checks=qaContractChecks(contract);
    const requiresAnswer=["single_choice","sequence","matching"].includes(contract.inputType);
    return {row,contract,checks,approvalReady:qaApprovalAllowed(checks,requiresAnswer)};
  });

  const counts = {
    unreviewed: items.filter(item=>String(item.row.qa_status)==="unreviewed").length,
    inReview: items.filter(item=>String(item.row.qa_status)==="in_review").length,
    needsChanges: items.filter(item=>String(item.row.qa_status)==="needs_changes").length,
    approved: items.filter(item=>String(item.row.qa_status)==="approved").length,
  };

  return <main className="workspacePage">
    <header className="topbar">
      <Link className="brand" href="/workspace/admin">Career Compass Junior</Link>
      <div><strong>Curriculum QA</strong><div className="muted" style={{fontSize:12}}>Contract review · learner simulation · approval</div></div>
      <Link className="pill" href="/workspace/admin">Admin</Link>
    </header>

    <div className="workspaceContent">
      <section className="metricGrid">
        <Metric label="Unreviewed" value={String(counts.unreviewed)} />
        <Metric label="In review" value={String(counts.inReview)} />
        <Metric label="Needs changes" value={String(counts.needsChanges)} />
        <Metric label="Approved" value={String(counts.approved)} />
      </section>

      <section className="panel">
        <div className="eyebrow">Internal curriculum quality</div>
        <h1 className="workspaceHeroTitle">Review the same contract the learner runtime uses.</h1>
        <p className="muted">Approval is blocked for objective activities when required contract metadata or the authoritative answer is missing.</p>
      </section>

      <section className="workspaceList">
        {items.map(({row,contract,checks,approvalReady}) => <article className="panel" key={String(row.id)}>
          <div className="workspaceRow" style={{padding:0}}>
            <div>
              <div className="eyebrow">{String(row.book_code)} · {String(row.unit_code)} · {String(row.code)}</div>
              <h2 className="workspaceTitle">{String(row.title_en)}</h2>
              <div className="muted">{String(row.title_vi)} · {contract.activityType.replaceAll("_"," ")} · v{contract.contentVersion}</div>
            </div>
            <span className="pill">{String(row.qa_status)}</span>
          </div>

          <div className="miniGrid" style={{marginTop:12}}>
            <Check label="Objective" ok={checks.objective} />
            <Check label="Language" ok={checks.languageContext} />
            <Check label="Age band" ok={checks.ageBand} />
            <Check label="English level" ok={checks.englishLevel} />
            <Check label="Completion" ok={checks.completionRule} />
            <Check label="Evidence" ok={checks.evidencePolicy} />
            <Check label="Answer key" ok={contract.answerDefinition != null || !["single_choice","sequence","matching"].includes(contract.inputType)} />
          </div>

          <div className="actions" style={{marginTop:12}}>
            <Link className="button soft" href={`/workspace/admin/curriculum-qa/${String(row.id)}`}>Inspect + Test as Learner</Link>
            <span className="pill">{approvalReady ? "approval-ready" : "incomplete"}</span>
          </div>

          <form action={updateActivityQa} className="workspaceForm" style={{marginTop:12}}>
            <input type="hidden" name="activityId" value={String(row.id)} />
            <label><span>Reviewer notes</span><textarea name="notes" rows={2} maxLength={3000} defaultValue={String(row.qa_notes||"")} /></label>
            <div className="actions">
              <button className="button" name="status" value="in_review">In review</button>
              <button className="button" name="status" value="needs_changes">Needs changes</button>
              <button className="button primary" name="status" value="approved" disabled={!approvalReady}>Approve</button>
            </div>
          </form>
        </article>)}
      </section>
    </div>
  </main>;
}

function Gate(){return <main className="workspacePage"><div className="workspaceContent"><section className="panel gatePanel"><h1>Platform administrator access required.</h1><Link className="button" href="/workspace/admin">Back</Link></section></div></main>;}
function Metric({label,value}:{label:string;value:string}){return <div className="metric"><span className="muted">{label}</span><strong>{value}</strong></div>;}
function Check({label,ok}:{label:string;ok:boolean}){return <div className="miniCard light"><strong>{ok?"✓":"!"}</strong><span>{label}</span></div>;}
