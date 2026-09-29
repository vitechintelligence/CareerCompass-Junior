import Link from "next/link";
import { getPlatformAdminContext } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { TEACHER_UPSKILL_MODULES } from "@/lib/teacher-upskill-catalog";
import { reviewTeacherLearningEvidence } from "@/app/workspace/teacher/upskill/actions";

export const dynamic = "force-dynamic";

const moduleMap = new Map(TEACHER_UPSKILL_MODULES.map((module) => [module.key, module]));

export default async function AdminTeacherEvidencePage() {
  const admin = await getPlatformAdminContext();
  if (!admin) return <Gate />;

  const sql = getDb();
  const rows = await sql`
    select
      tlp.teacher_id, tlp.module_key, tlp.status, tlp.evidence_status,
      tlp.evidence, tlp.updated_at, tlp.review_notes, tlp.reviewed_at,
      p.semantic_id, p.display_name
    from teacher_learning_progress tlp
    join profiles p on p.id=tlp.teacher_id and p.status='active'
    where tlp.evidence_status in ('submitted','changes_requested','verified')
    order by
      case tlp.evidence_status when 'submitted' then 0 when 'changes_requested' then 1 else 2 end,
      tlp.updated_at desc
    limit 100
  `;

  const pending = rows.filter((row) => String(row.evidence_status) === "submitted").length;

  return <main className="workspacePage">
    <header className="topbar">
      <Link className="brand" href="/workspace/admin">Career Compass Junior</Link>
      <div><strong>Teacher Evidence Review</strong><div className="muted" style={{fontSize:12}}>Artifact · reflection · reviewer sign-off</div></div>
      <Link className="pill" href="/workspace/admin">Admin</Link>
    </header>

    <div className="workspaceContent">
      <section className="panel">
        <div className="eyebrow">Professional learning evidence</div>
        <h1 className="workspaceHeroTitle">{pending} submission{pending===1?"":"s"} waiting for review.</h1>
        <p className="muted">Module participation alone is not treated as verified teacher competency. Verification requires a submitted artifact, reflection and reviewer decision.</p>
      </section>

      <section className="workspaceList">
        {rows.length===0 ? <div className="panel"><p className="muted">No teacher evidence has been submitted yet.</p></div> :
        rows.map((row) => {
          const module = moduleMap.get(String(row.module_key));
          const evidence = row.evidence && typeof row.evidence === "object"
            ? row.evidence as Record<string, unknown>
            : {};
          const status = String(row.evidence_status);
          return <article className="panel" key={`${String(row.teacher_id)}-${String(row.module_key)}`}>
            <div className="workspaceRow" style={{padding:0}}>
              <div>
                <div className="eyebrow">{String(row.semantic_id)}</div>
                <h2 className="workspaceTitle">{module?.titleEn || String(row.module_key)}</h2>
                <div className="muted">{String(row.display_name || "Teacher")} · participation {String(row.status)}</div>
              </div>
              <span className="pill">evidence · {status.replaceAll("_"," ")}</span>
            </div>

            <div className="workspaceGrid" style={{marginTop:14}}>
              <div className="miniCard light"><strong>Artifact</strong><p style={{whiteSpace:"pre-wrap"}}>{typeof evidence.artifact==="string"?evidence.artifact:"No artifact text."}</p></div>
              <div className="miniCard light"><strong>Reflection</strong><p style={{whiteSpace:"pre-wrap"}}>{typeof evidence.reflection==="string"?evidence.reflection:"No reflection text."}</p></div>
            </div>

            {status !== "verified" ? <form action={reviewTeacherLearningEvidence} className="workspaceForm" style={{marginTop:14}}>
              <input type="hidden" name="teacherId" value={String(row.teacher_id)} />
              <input type="hidden" name="moduleKey" value={String(row.module_key)} />
              <label><span>Reviewer notes</span><textarea name="notes" rows={3} maxLength={4000} required defaultValue={String(row.review_notes||"")} /></label>
              <div className="actions">
                <button className="button" name="decision" value="changes_requested" type="submit">Request changes</button>
                <button className="button primary" name="decision" value="verified" type="submit">Verify evidence</button>
              </div>
            </form> : <p className="muted" style={{marginTop:12}}><strong>Verified.</strong> {row.review_notes ? String(row.review_notes) : "Reviewer sign-off recorded."}</p>}
          </article>;
        })}
      </section>
    </div>
  </main>;
}

function Gate(){return <main className="workspacePage"><div className="workspaceContent"><section className="panel gatePanel"><h1>Platform administrator access required.</h1><Link className="button" href="/workspace/admin">Back</Link></section></div></main>;}
