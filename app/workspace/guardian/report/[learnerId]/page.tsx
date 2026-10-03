import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";
import { isUuidReference } from "@/lib/auth/authorization-policy";
import { optionalProcessingAllowed } from "@/lib/privacy/access";

export const dynamic = "force-dynamic";

export default async function GuardianReportPage({
  params,
  searchParams,
}:{
  params:Promise<{learnerId:string}>;
  searchParams:Promise<{organizationId?:string}>;
}){
  if (!isRiskyFeatureEnabled("guardianReporting")) notFound();
  const user=await getSessionUser();
  if(!user) notFound();
  const profile=await getCurrentProfile();
  if(!profile || profile.status!=="active") notFound();

  const {learnerId}=await params;
  const {organizationId}=await searchParams;
  if(!isUuidReference(learnerId) || !isUuidReference(organizationId)) notFound();
  if(!await optionalProcessingAllowed(organizationId,learnerId,'guardian_reporting',profile.id))notFound();

  const sql=getDb();
  const links=await sql`
    select
      learner.semantic_id, learner.display_name,
      o.name as organization_name
    from guardian_report_links grl
    join profiles learner on learner.id=grl.learner_id and learner.status='active' and learner.account_type='student'
    join organizations o on o.id=grl.organization_id and o.status='active'
    join organization_memberships om on om.organization_id=grl.organization_id
      and om.profile_id=grl.learner_id and om.role='student' and om.status='active'
    where grl.guardian_profile_id=${profile.id}
      and grl.learner_id=${learnerId}
      and grl.organization_id=${organizationId}
      and grl.status='active'

    limit 1
  `;
  const link=links[0];
  if(!link) notFound();

  const [evidence,improvements,nextWork]=await Promise.all([
    sql`
      select title_en, title_vi, mastery_level, status, achieved_on
      from learning_capsules
      where learner_id=${learnerId}
        and organization_id=${organizationId}
        and status in ('verified','released')
        and mastery_level in ('demonstrated','verified')
        and sharing_scope='shareable'
      order by achieved_on desc nulls last, created_at desc
      limit 20
    `,
    sql`
      select a.title_en, a.title_vi, s.current_revision, s.status,
        tf.feedback_text, tf.score
      from submissions s
      join assignments a on a.id=s.assignment_id
      join classes c on c.id=a.class_id
      left join lateral (
        select feedback_text, score
        from teacher_feedback
        where submission_id=s.id and visibility='student'
        order by created_at desc
        limit 1
      ) tf on true
      where s.student_id=${learnerId}
        and c.organization_id=${organizationId}
        and s.current_revision > 1
      order by s.updated_at desc
      limit 10
    `,
    sql`
      select a.title_en, a.title_vi, s.status, a.due_at
      from assignments a
      join classes c on c.id=a.class_id
      join class_memberships cm on cm.class_id=c.id and cm.student_id=${learnerId} and cm.status='active'
      left join submissions s on s.assignment_id=a.id and s.student_id=${learnerId}
      where c.organization_id=${organizationId}
        and a.status='published'
        and (s.id is null or s.status in ('draft','returned'))
      order by a.due_at asc nulls last
      limit 10
    `,
  ]);

  return <main className="workspacePage">
    <header className="topbar"><Link className="brand" href="/workspace/guardian">Guardian Reports</Link><strong>{String(link.organization_name)}</strong><Link className="pill" href="/workspace/guardian">Back</Link></header>
    <div className="workspaceContent">
      <section className="workspaceIdentity"><div><div className="eyebrow">Consent-gated learning report</div><h1 className="workspaceHeroTitle">{String(link.display_name || link.semantic_id)}</h1><p className="muted">This summary uses recorded learning evidence and teacher feedback; it does not infer hidden traits or career outcomes.</p></div></section>
      <section className="panel"><div className="eyebrow">Demonstrated / verified learning</div>{evidence.length===0?<p className="muted">No recorded evidence yet.</p>:<div className="workspaceList">{evidence.map((item,index)=><div className="workspaceRow" key={`${String(item.title_en)}-${index}`}><div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.title_vi)}</div></div><span className="pill">{String(item.mastery_level||item.status)}</span></div>)}</div>}</section>
      <section className="panel"><div className="eyebrow">Improvement through revision</div>{improvements.length===0?<p className="muted">No multi-revision assignments yet.</p>:<div className="workspaceList">{improvements.map((item,index)=><div className="feedbackCard" key={`${String(item.title_en)}-${index}`}><strong>{String(item.title_en)} · revision {String(item.current_revision)}</strong>{item.feedback_text&&<p>{String(item.feedback_text)}</p>}</div>)}</div>}</section>
      <section className="panel"><div className="eyebrow">Next work</div>{nextWork.length===0?<p className="muted">No unfinished or returned class work is currently recorded.</p>:<div className="workspaceList">{nextWork.map((item,index)=><div className="workspaceRow" key={`${String(item.title_en)}-${index}`}><div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.title_vi)}</div></div><span className="pill">{String(item.status||"not started")}</span></div>)}</div>}</section>
      <section className="panel"><div className="eyebrow">Try this at home · Gợi ý tại nhà</div><p>Ask the learner to explain one recent task, show one change they made after feedback, and choose one small next step.</p><p className="muted">Hãy yêu cầu học sinh giải thích một nhiệm vụ gần đây, chỉ ra một thay đổi sau góp ý và chọn một bước nhỏ tiếp theo.</p></section>
    </div>
  </main>;
}
