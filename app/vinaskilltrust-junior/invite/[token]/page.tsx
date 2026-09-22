import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getDb } from "@/lib/db";
import {
  parseJuniorAdminMeta,
  parseJuniorRequestPayload,
  verifyJuniorInviteToken,
} from "@/lib/vinaskilltrust-junior";
import { respondToJuniorInvitation, submitJuniorSimulationProposal } from "./actions";

export const dynamic = "force-dynamic";

export default async function JuniorCompanyInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyJuniorInviteToken(token);

  if (!verified) return <InvalidInvite />;

  const sql = getDb();
  const rows = await sql`
    select r.id, r.company_name, r.company_website, r.sector, r.collaboration_types, r.note, r.admin_note, r.status,
           o.name as organization_name
    from industry_connection_requests r
    join organizations o on o.id=r.organization_id
    where r.id=${verified.requestId}
    limit 1
  `;
  const request = rows[0];
  const payload = parseJuniorRequestPayload(request?.note);
  if (!request || !payload || payload.companyEmail.toLowerCase() !== verified.companyEmail) return <InvalidInvite />;

  const meta = parseJuniorAdminMeta(request.admin_note);
  const accepted = meta.companyResponse?.status === "accepted";
  const simulation = meta.simulation;

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>VinaSkillTrust Junior</span></Link>
        <div><strong>Company Invitation</strong><div className="muted" style={{ fontSize: 12 }}>Grade 11–12 · monitored by ViTech</div></div>
        <span className="pill">Career Compass Junior</span>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">{String(request.organization_name)} → {String(request.company_name)}</div>
            <h1 className="workspaceHeroTitle">Help senior-secondary learners understand real work — safely.</h1>
            <p className="muted">This invitation is limited to Grade {payload.grades.join(" & Grade ")}. No student profile data was sent with this request. Participation does not create employment, agency, endorsement or partnership with ViTech.</p>
          </div>
          <span className="pill">{String(request.status)}</span>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">School request</div>
            <h2 className="workspaceTitle">{String(request.company_name)}</h2>
            <div className="workspaceList">
              <div className="workspaceRow"><strong>Institution</strong><span>{String(request.organization_name)}</span></div>
              <div className="workspaceRow"><strong>Eligible cohort</strong><span>Grade {payload.grades.join(" + Grade ")}</span></div>
              <div className="workspaceRow"><strong>Requested collaboration</strong><span>{(Array.isArray(request.collaboration_types) ? request.collaboration_types : []).map(String).join(" · ") || "Career exposure"}</span></div>
            </div>
            <div className="feedbackCard" style={{ marginTop: 16 }}>
              <strong>Message from the institution</strong>
              <p className="muted">{payload.message || "The institution would like learners to understand real roles, skills and age-appropriate work."}</p>
            </div>
          </article>

          <article className="panel">
            <div className="eyebrow">Safeguarded connection</div>
            <h2 className="workspaceTitle">Company response</h2>
            {meta.companyResponse ? (
              <div className="feedbackCard">
                <strong>Response: {meta.companyResponse.status.replaceAll("_", " ")}</strong>
                {meta.companyResponse.note && <p className="muted">{meta.companyResponse.note}</p>}
                <p className="muted" style={{ marginBottom: 0 }}>Recorded {new Date(meta.companyResponse.respondedAt).toLocaleString("en-GB")}</p>
              </div>
            ) : (
              <form action={respondToJuniorInvitation} className="workspaceForm">
                <input type="hidden" name="token" value={token} />
                <label><span>Optional response note</span><textarea name="responseNote" rows={4} maxLength={2000} placeholder="Questions, conditions or the right company contact…" /></label>

                <div className="feedbackCard">
                  <strong>Required before accepting</strong>
                  <div className="workspaceForm" style={{ marginTop: 10 }}>
                    <label className="tag" style={{ whiteSpace: "normal" }}><input type="checkbox" name="ageAppropriate" value="yes" /> Any activity or simulation we propose will be age-appropriate for Grade 11–12 learners.</label>
                    <label className="tag" style={{ whiteSpace: "normal" }}><input type="checkbox" name="noStudentData" value="yes" /> We will not request unnecessary student personal or sensitive data.</label>
                    <label className="tag" style={{ whiteSpace: "normal" }}><input type="checkbox" name="noOffPlatformContact" value="yes" /> We will not request private off-platform communication with students.</label>
                    <label className="tag" style={{ whiteSpace: "normal" }}><input type="checkbox" name="moderation" value="yes" /> We understand ViTech may review, reject, pause or remove inappropriate simulation content.</label>
                  </div>
                </div>

                <div className="actions">
                  <button className="button primary" type="submit" name="response" value="accepted">Accept & continue</button>
                  <button className="button soft" type="submit" name="response" value="info_requested">Request more information</button>
                  <button className="button soft" type="submit" name="response" value="declined">Decline</button>
                </div>
              </form>
            )}
          </article>
        </section>

        {accepted && (
          <section className="panel">
            <div className="eyebrow">VinaSkillTrust Junior simulation studio</div>
            <h2 className="workspaceTitle">Propose an age-appropriate work simulation</h2>
            <p className="muted">Keep the experience educational, bounded and suitable for Grade 11–12. Do not ask learners to perform productive unpaid work for the company, contact customers, access confidential systems or share private information.</p>

            {simulation ? (
              <div className="feedbackCard">
                <span className="pill">{simulation.status}</span>
                <h3>{simulation.title}</h3>
                <p className="muted">{simulation.overview}</p>
                <p><strong>Learning objectives:</strong> {simulation.learningObjectives}</p>
                <p><strong>Learner tasks:</strong> {simulation.tasks}</p>
                <p className="muted">Estimated time: {simulation.estimatedMinutes} minutes · Grades {simulation.allowedGrades.join(" & ")}</p>
                {simulation.moderationNote && <p className="muted"><strong>ViTech moderation:</strong> {simulation.moderationNote}</p>}
              </div>
            ) : (
              <form action={submitJuniorSimulationProposal} className="workspaceForm">
                <input type="hidden" name="token" value={token} />
                <label><span>Simulation title</span><input name="title" required maxLength={180} placeholder="Example: Design a simple customer support improvement" /></label>
                <label><span>Student-friendly overview</span><textarea name="overview" required rows={4} maxLength={3000} placeholder="What real-world context will students explore?" /></label>
                <label><span>Learning objectives</span><textarea name="learningObjectives" required rows={4} maxLength={3000} placeholder="What should learners understand or practice?" /></label>
                <label><span>Bounded learner tasks</span><textarea name="tasks" required rows={6} maxLength={5000} placeholder="Describe the fictional/sandbox tasks. Do not include customer work, production access or collection of student personal data." /></label>
                <label><span>Estimated time (minutes)</span><input name="estimatedMinutes" type="number" min={15} max={240} defaultValue={60} /></label>
                <label><span>Safety / facilitation notes</span><textarea name="safetyNotes" rows={4} maxLength={2500} placeholder="Teacher facilitation, fictional data, prohibited actions, accessibility notes…" /></label>
                <button className="button primary" type="submit">Submit to ViTech for moderation</button>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function InvalidInvite() {
  return (
    <main className="workspacePage">
      <div className="workspaceContent">
        <section className="panel gatePanel">
          <h1>Invitation unavailable</h1>
          <p className="muted">This secure VinaSkillTrust Junior invitation is invalid or has expired. Ask the participating institution to send a new invitation.</p>
          <Link className="button primary" href="/">Career Compass Junior</Link>
        </section>
      </div>
    </main>
  );
}
