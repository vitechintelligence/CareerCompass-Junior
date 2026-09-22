import Link from "next/link";
import { createHash } from "node:crypto";
import { VitechMark } from "@/app/VitechMark";
import { getDb } from "@/lib/db";
import { respondToVstJuniorInvitation, submitVstJuniorSimulation } from "./actions";

export const dynamic = "force-dynamic";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export default async function CompanyInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sql = getDb();
  const rows = token.length >= 32 ? await sql`
    select i.id as invitation_id, i.expires_at, (i.expires_at <= now()) as expired, i.response_status, i.responder_name,
           r.id as request_id, r.company_name, r.company_website, r.sector, r.collaboration_types,
           r.note, r.target_grades, o.name as organization_name
    from vst_junior_company_invitations i
    join industry_connection_requests r on r.id=i.request_id
    join organizations o on o.id=r.organization_id
    where i.token_hash=${hashToken(token)}
    limit 1
  ` : [];
  const invitation = rows[0];

  if (!invitation) return <InvalidInvite copy="This secure invitation could not be found." />;
  const expired = Boolean(invitation.expired);
  const accepted = String(invitation.response_status) === "accepted";
  if (expired) return <InvalidInvite copy="This secure invitation has expired. Ask the school to send a new request before responding or submitting another simulation." />;

  const simulations = accepted ? await sql`
    select id, title, target_grades, status, moderation_note, created_at
    from vst_junior_simulations
    where invitation_id=${String(invitation.invitation_id)}
    order by created_at desc
  ` : [];

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>VinaSkillTrust Junior</span></Link>
        <span className="pill">Grade 11-12 · company connection</span>
      </header>
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">Secure company invitation</div>
            <h1 className="workspaceHeroTitle">{String(invitation.organization_name)} would like to connect with {String(invitation.company_name)}.</h1>
            <p className="muted">This is a school-to-company introduction for Grade 11-12 career exploration. No student personal data is exposed through this invitation.</p>
          </div>
          <span className="pill">{String(invitation.response_status).replaceAll("_"," ")}</span>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Request</div>
            <h2 className="workspaceTitle">What the school is asking for</h2>
            <div className="tagRow">{(Array.isArray(invitation.collaboration_types) ? invitation.collaboration_types : []).map((item) => <span className="tag" key={String(item)}>{String(item).replaceAll("_"," ")}</span>)}</div>
            <p className="muted">{String(invitation.note || "The school has not added a detailed note.")}</p>
            <p className="muted"><strong>Eligible learners:</strong> Grade {(Array.isArray(invitation.target_grades) ? invitation.target_grades : []).map(String).join(" & ")}</p>
          </article>

          <article className="panel">
            <div className="eyebrow">Safeguards</div>
            <h2 className="workspaceTitle">How VinaSkillTrust Junior works</h2>
            <p className="muted">ViTech provides the controlled bridge and simulation environment. Company acceptance does not automatically publish anything to learners. Simulations are reviewed by ViTech for Grade 11-12 appropriateness, safety, privacy and clear educational value before release.</p>
          </article>
        </section>

        {!accepted && String(invitation.response_status) !== "declined" && (
          <section className="panel" style={{ marginTop: 18 }}>
            <div className="eyebrow">Company response</div>
            <h2 className="workspaceTitle">Respond to the school</h2>
            <form action={respondToVstJuniorInvitation} className="workspaceForm">
              <input type="hidden" name="token" value={token} />
              <label><span>Your name</span><input name="responderName" maxLength={160} required /></label>
              <label><span>Your role/title</span><input name="responderTitle" maxLength={160} required /></label>
              <label><span>Optional message</span><textarea name="responseNote" rows={4} maxLength={2000} /></label>
              <div className="actions">
                <button className="button primary" name="decision" value="accepted" type="submit">Accept connection</button>
                <button className="button soft" name="decision" value="more_info" type="submit">Request more information</button>
                <button className="button" name="decision" value="declined" type="submit">Decline</button>
              </div>
            </form>
          </section>
        )}

        {accepted && (
          <>
            <section className="panel" style={{ marginTop: 18 }}>
              <div className="eyebrow">VinaSkillTrust Junior simulation studio</div>
              <h2 className="workspaceTitle">Propose an age-appropriate real-work simulation</h2>
              <p className="muted">Design a realistic but safe Grade 11-12 task. Do not request student personal contact information, unpaid productive labor, sensitive data, hazardous activity or off-platform communication as part of the simulation.</p>
              <form action={submitVstJuniorSimulation} className="workspaceForm">
                <input type="hidden" name="token" value={token} />
                <label><span>Simulation title</span><input name="title" maxLength={180} required placeholder="Example: Junior customer-support triage challenge" /></label>
                <label><span>What students will learn</span><textarea name="summary" rows={4} maxLength={3000} required /></label>
                <label><span>Student brief / instructions</span><textarea name="instructions" rows={7} maxLength={5000} required /></label>
                <div><span className="muted" style={{ fontSize: 12 }}>Target grades approved by the institution</span><div className="tagRow">{(Array.isArray(invitation.target_grades) ? invitation.target_grades : []).map((grade) => <label className="tag" key={String(grade)}><input type="checkbox" name="targetGrades" value={String(grade)} /> Grade {String(grade)}</label>)}</div></div>
                <label><span>Safety / supervision notes</span><textarea name="safetyNotes" rows={3} maxLength={2000} /></label>
                <label className="tag" style={{ alignItems: "flex-start" }}><input type="checkbox" name="companySafeguards" value="yes" required /> I understand that this simulation is limited to Grade 11-12 and must pass ViTech moderation before learners can access it.</label>
                <button className="button primary" type="submit">Submit simulation for ViTech review</button>
              </form>
            </section>

            <section className="panel" style={{ marginTop: 18 }}>
              <div className="eyebrow">Moderation status</div>
              <h2 className="workspaceTitle">Your submitted simulations</h2>
              {simulations.length === 0 ? <p className="muted">No simulation proposals submitted yet.</p> : (
                <div className="workspaceList">{simulations.map((item) => (
                  <div className="workspaceRow" key={String(item.id)}>
                    <div><strong>{String(item.title)}</strong><div className="muted">Grade {(Array.isArray(item.target_grades) ? item.target_grades : []).map(String).join(" & ")} · {new Date(String(item.created_at)).toLocaleDateString("en-GB")}</div>{item.moderation_note && <div className="muted">{String(item.moderation_note)}</div>}</div>
                    <span className="pill">{String(item.status)}</span>
                  </div>
                ))}</div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function InvalidInvite({ copy }: { copy: string }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>VinaSkillTrust Junior</span></Link></header><div className="workspaceContent"><section className="panel gatePanel"><h1>Invitation unavailable</h1><p className="muted">{copy}</p></section></div></main>;
}
