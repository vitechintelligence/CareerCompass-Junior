import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureStudentProfile, getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getPlatformAdminContext } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StudentEvidenceTimelinePage(){
  const user=await getSessionUser();
  if(!user) return <Gate/>;
  const admin=await getPlatformAdminContext();
  if(admin) redirect("/workspace/admin");
  let profile=await getCurrentProfile();
  if(!profile) profile=await ensureStudentProfile("vi");
  if(!profile || profile.status!=="active" || profile.account_type!=="student") return <Gate signedIn/>;

  const sql=getDb();
  const events=await sql`
    select * from (
      select
        aa.submitted_at as event_at,
        'activity_attempt'::text as source_type,
        a.title_en, a.title_vi,
        lower(coalesce(aa.response #>> '{evaluation,level}', 'practiced')) as evidence_level,
        jsonb_build_object(
          'attempt', aa.attempt_number,
          'activityContentVersion', aa.activity_content_version,
          'contractVersion', aa.contract_version,
          'score', aa.score,
          'status', aa.completion_status
        ) as detail
      from activity_attempts aa
      join activities a on a.id=aa.activity_id
      where aa.student_id=${profile.id}

      union all

      select
        sr.submitted_at as event_at,
        'submission_revision'::text as source_type,
        a.title_en, a.title_vi,
        case when s.status='accepted' and s.current_revision=sr.revision_number then 'verified' else 'practiced' end as evidence_level,
        jsonb_build_object(
          'revision', sr.revision_number,
          'submissionStatus', s.status
        ) as detail
      from submission_revisions sr
      join submissions s on s.id=sr.submission_id
      join assignments a on a.id=s.assignment_id
      where s.student_id=${profile.id}

      union all

      select
        aa.submitted_at as event_at,
        'assessment_attempt'::text as source_type,
        a.title_en, a.title_vi,
        aa.evidence_level,
        jsonb_build_object(
          'attempt', aa.attempt_number,
          'assessmentContentVersion', aa.assessment_content_version,
          'score', aa.score,
          'maxScore', aa.max_score,
          'reviewFeedback', aa.review_feedback
        ) as detail
      from assessment_attempts aa
      join assessments a on a.id=aa.assessment_id
      where aa.student_id=${profile.id}

      union all

      select
        coalesce(lc.verified_at, lc.created_at) as event_at,
        lc.source_type,
        lc.title_en, lc.title_vi,
        coalesce(lc.mastery_level, case when lc.status='verified' then 'verified' else 'demonstrated' end) as evidence_level,
        lc.evidence_summary as detail
      from learning_capsules lc
      where lc.learner_id=${profile.id}
        and lc.status in ('draft','verified','released')
    ) timeline
    order by event_at desc nulls last
    limit 100
  `;

  return <main className="workspacePage">
    <header className="topbar"><Link className="brand" href="/workspace/student">Career Compass Junior</Link><div><strong>My Evidence Timeline</strong><div className="muted" style={{fontSize:12}}>Practice · demonstrated learning · teacher verification</div></div><Link className="pill" href="/workspace/student">My Compass</Link></header>
    <div className="workspaceContent">
      <section className="panel"><div className="eyebrow">Learning provenance</div><h1 className="workspaceHeroTitle">See how your work became evidence.</h1><p className="muted">Practice and drafts remain visible as practice. Demonstrated and verified evidence are labeled separately.</p></section>
      <section className="workspaceList">
        {events.length===0 ? <div className="panel"><p className="muted">No learning evidence events yet.</p></div> :
        events.map((event,index)=><article className="panel" key={`${String(event.source_type)}-${String(event.event_at)}-${index}`}>
          <div className="workspaceRow" style={{padding:0}}>
            <div><strong>{String(event.title_en)}</strong><div className="muted">{String(event.title_vi)} · {String(event.source_type).replaceAll("_"," ")}</div></div>
            <span className="pill">{String(event.evidence_level).toLowerCase()}</span>
          </div>
          <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",marginTop:10}}>{JSON.stringify(event.detail,null,2)}</pre>
          {event.event_at && <div className="muted">{new Date(String(event.event_at)).toLocaleString(profile.preferred_locale==="vi"?"vi-VN":"en-GB")}</div>}
        </article>)}
      </section>
    </div>
  </main>;
}

function Gate({signedIn=false}:{signedIn?:boolean}){return <main className="workspacePage"><div className="workspaceContent"><section className="panel gatePanel"><h1>{signedIn?"Student access required":"Sign in required"}</h1><Link className="button primary" href="/auth/sign-in?callbackURL=%2Fworkspace%2Fstudent%2Fevidence">Sign in</Link></section></div></main>;}
