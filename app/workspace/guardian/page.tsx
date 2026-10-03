import Link from "next/link";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function GuardianWorkspacePage() {
  if (!isRiskyFeatureEnabled("guardianReporting")) return <Disabled />;
  const user=await getSessionUser();
  if(!user) return <Gate/>;
  const profile=await getCurrentProfile();
  if(!profile || profile.status!=="active") return <Gate/>;

  const sql=getDb();
  const links=await sql`
    select
      grl.learner_id, grl.organization_id,
      learner.semantic_id as learner_semantic_id,
      learner.display_name as learner_name,
      o.name as organization_name
    from guardian_report_links grl
    join profiles learner on learner.id=grl.learner_id and learner.status='active'
    join organizations o on o.id=grl.organization_id and o.status='active'
    where grl.guardian_profile_id=${profile.id}
      and grl.status='active'
      and exists (
        select 1
        from learner_consent_records lcr
        where lcr.learner_id=grl.learner_id
          and lcr.organization_id=grl.organization_id
          and lcr.consent_type='guardian_reporting'
          and lcr.status='active'
          and lcr.guardian_confirmation=true
          and lcr.revoked_at is null
      )
    order by o.name, learner.semantic_id
  `;

  return <main className="workspacePage">
    <header className="topbar"><Link className="brand" href="/">Career Compass Junior</Link><strong>Guardian Reports</strong><Link className="pill" href="/">Home</Link></header>
    <div className="workspaceContent">
      <section className="panel">
        <div className="eyebrow">Authenticated report access</div>
        <h1 className="workspaceHeroTitle">Linked learner reports</h1>
        <p className="muted">This page grants report access only. It does not grant class management, assignments, messages, or the learner’s workspace.</p>
      </section>
      <section className="panel">
        {links.length===0 ? <p className="muted">No active guardian report links are available for this signed-in account.</p> : <div className="workspaceList">
          {links.map(item=><div className="workspaceRow" key={`${String(item.learner_id)}-${String(item.organization_id)}`}>
            <div><strong>{String(item.learner_name || item.learner_semantic_id)}</strong><div className="muted">{String(item.organization_name)}</div></div>
            <Link className="button primary" href={`/workspace/guardian/report/${String(item.learner_id)}?organizationId=${encodeURIComponent(String(item.organization_id))}`}>Open report</Link>
          </div>)}
        </div>}
      </section>
    </div>
  </main>;
}

function Gate(){return <main className="workspacePage"><div className="workspaceContent"><section className="panel gatePanel"><h1>Sign in required.</h1><p className="muted">Use the account your institution linked for guardian report access.</p><Link className="button primary" href="/auth/sign-in?callbackURL=%2Fworkspace%2Fguardian">Sign in</Link></section></div></main>;}


function Disabled(){return <main className="workspacePage"><div className="workspaceContent"><section className="panel gatePanel"><h1>Guardian reporting is currently disabled.</h1><p className="muted">The rollout flag is off. Existing links remain stored but no report data is rendered.</p></section></div></main>;}
