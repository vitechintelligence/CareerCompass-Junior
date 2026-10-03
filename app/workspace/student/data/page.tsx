import Link from "next/link";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { requestDeletionReview } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentDataPage() {
  const user=await getSessionUser();
  if(!user) return <Gate/>;
  const profile=await getCurrentProfile();
  if(!profile || profile.status!=="active" || profile.account_type!=="student") return <Gate/>;

  const sql=getDb();
  const requests=await sql`
    select id, request_type, status, requested_at, resolved_at
    from data_lifecycle_requests
    where learner_id=${profile.id}
    order by requested_at desc
    limit 10
  `;

  return <main className="workspacePage">
    <header className="topbar"><Link className="brand" href="/workspace/student">Career Compass Junior</Link><strong>My Data</strong><Link className="pill" href="/privacy/learner-data">Data notice</Link></header>
    <div className="workspaceContent">
      <section className="panel">
        <div className="eyebrow">Export</div>
        <h1 className="workspaceHeroTitle">Download a copy of your Career Compass records.</h1>
        <p className="muted">The export is generated from your authenticated learner account and is never shared with another learner.</p>
        <a className="button primary" href="/api/account/export">Download my JSON export</a>
      </section>

      <section className="panel">
        <div className="eyebrow">Deletion review</div>
        <h2 className="workspaceTitle">Request review before destructive deletion.</h2>
        <p className="muted">Educational records may be linked to a school class, feedback, consent, or verified evidence. This request starts a review; it does not silently erase data or bypass the institution’s retention responsibilities.</p>
        <form action={requestDeletionReview}>
          <button className="button" type="submit">Request deletion review</button>
        </form>
      </section>

      <section className="panel">
        <div className="eyebrow">Request history</div>
        {requests.length===0 ? <p className="muted">No lifecycle requests yet.</p> : <div className="workspaceList">{requests.map(item=><div className="workspaceRow" key={String(item.id)}><div><strong>{String(item.request_type).replaceAll("_"," ")}</strong><div className="muted">{new Date(String(item.requested_at)).toLocaleString("en-GB")}</div></div><span className="pill">{String(item.status)}</span></div>)}</div>}
      </section>
    </div>
  </main>;
}

function Gate(){return <main className="workspacePage"><div className="workspaceContent"><section className="panel gatePanel"><h1>Student sign-in required.</h1><Link className="button primary" href="/auth/sign-in?callbackURL=%2Fworkspace%2Fstudent%2Fdata">Sign in</Link></section></div></main>;}
