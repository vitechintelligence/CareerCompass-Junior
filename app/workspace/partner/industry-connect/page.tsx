import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { VST_JUNIOR_AGREEMENT } from "@/lib/vst-junior-terms";
import { CompanyContactFinder } from "./CompanyContactFinder";
import { requestCompanyConnection, requestVerifiedCompany } from "./actions";

export const dynamic = "force-dynamic";

function AgreementChecks() {
  const agreement = VST_JUNIOR_AGREEMENT.en;
  return (
    <div className="feedbackCard" style={{ marginTop: 8 }}>
      <div className="eyebrow">Required before sending</div>
      <h3>{agreement.title}</h3>
      <p className="muted"><strong>Grade restriction:</strong> {agreement.eligibility}</p>
      <label className="tag" style={{ alignItems: "flex-start", marginTop: 8 }}>
        <input type="checkbox" name="gradeEligibility" value="yes" required />
        I confirm this request is only for Grade 11 and/or Grade 12 learners.
      </label>
      <label className="tag" style={{ alignItems: "flex-start", marginTop: 8 }}>
        <input type="checkbox" name="dataResponsibility" value="yes" required />
        I understand the institution is responsible for its legal basis, notices/consents and any information it chooses to share with the company. No student personal data should be included in this request.
      </label>
      <label className="tag" style={{ alignItems: "flex-start", marginTop: 8 }}>
        <input type="checkbox" name="bridgeRole" value="yes" required />
        I understand ViTech provides the controlled introduction platform and, unless separately agreed in writing, does not represent or guarantee the company or create an employment relationship.
      </label>
      <label className="tag" style={{ alignItems: "flex-start", marginTop: 8 }}>
        <input type="checkbox" name="moderation" value="yes" required />
        I agree that company-created simulations are subject to ViTech review and may be rejected, paused or changed if unsafe, inappropriate, misleading or privacy-invasive.
      </label>
      <p className="muted" style={{ fontSize: 12 }}>{agreement.acceptance}</p>
    </div>
  );
}

export default async function IndustryConnectPage() {
  const user = await getSessionUser();
  if (!user) return <Gate />;
  const profile = await getCurrentProfile();
  if (!profile || !["partner_admin", "platform_admin"].includes(profile.account_type)) return <Gate signedIn />;

  const sql = getDb();
  const organizations = profile.account_type === "platform_admin"
    ? await sql`select id, name from organizations where status='active' order by name`
    : await sql`
        select o.id, o.name
        from organization_memberships om
        join organizations o on o.id=om.organization_id
        where om.profile_id=${profile.id}
          and om.role='partner_admin'
          and om.status='active'
          and o.status='active'
        order by o.name
      `;
  const organization = organizations[0];
  if (!organization) return <Gate signedIn />;
  const organizationId = String(organization.id);

  const enabledFeature = await sql`
    select 1 from organization_features
    where organization_id=${organizationId}
      and feature_key='industry_connector'
      and enabled=true
    limit 1
  `;
  if (!enabledFeature[0]) {
    return <FeatureGate organizationName={String(organization.name)} />;
  }

  const [partners, roles, connections, requests] = await Promise.all([
    sql`select id, company_name, website, sector, overview_en, overview_vi from industry_partners where status='verified' order by company_name`,
    sql`
      select r.id, r.industry_partner_id, r.title_en, r.title_vi, r.summary_en, r.summary_vi, r.skill_tags, r.age_relevance
      from industry_roles r
      join industry_partners p on p.id=r.industry_partner_id
      where p.status='verified' and r.status='published'
      order by r.title_en
    `,
    sql`
      select c.industry_partner_id, c.status, c.target_grades, p.company_name
      from school_company_connections c
      join industry_partners p on p.id=c.industry_partner_id
      where c.organization_id=${organizationId}
      order by c.updated_at desc
    `,
    sql`
      select id, company_name, company_email, company_website, sector, collaboration_types,
             target_grades, delivery_status, company_response_status, status, created_at
      from industry_connection_requests
      where organization_id=${organizationId}
      order by created_at desc
      limit 20
    `,
  ]);

  const connectionByPartner = new Map(connections.map((item) => [String(item.industry_partner_id), item]));

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>VinaSkillTrust Junior</strong><div className="muted" style={{ fontSize: 12 }}>School ↔ Company · Grade 11–12 only · ViTech moderated</div></div>
        <Link className="pill" href="/workspace/partner">Partner Workspace</Link>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">{String(organization.name)} · controlled industry connection</div>
            <h1 className="workspaceHeroTitle">Bridge Grade 11–12 learners to real companies without turning students into a workforce.</h1>
            <p className="muted">Use verified career context, role intelligence and age-appropriate simulations to help older secondary students compare university, vocational and employment pathways. Company content is never released automatically.</p>
          </div>
          <span className="pill">Grade 11–12 ONLY</span>
        </section>

        <section className="panel" style={{ marginTop: 18 }}>
          <div className="eyebrow">Before you connect</div>
          <h2 className="workspaceTitle">Privacy, responsibility and safeguarding are part of the workflow.</h2>
          <p className="muted">The school controls which eligible learners participate and remains responsible for school-side notices, permissions and data it chooses to share. ViTech provides the platform bridge and moderates simulation content. Do not place student names, private contacts, health information, government identifiers or sensitive family information in a company request.</p>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Invite a company</div>
            <h2 className="workspaceTitle">Create a Grade 11–12 connection request</h2>
            <form action={requestCompanyConnection} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label><span>Company name</span><input name="companyName" maxLength={180} required placeholder="Company or employer" /></label>
              <label><span>Official company email</span><input name="companyEmail" maxLength={254} type="email" required placeholder="partnerships@company.com" /></label>
              <label><span>Contact person (optional)</span><input name="companyContactName" maxLength={160} placeholder="Partnerships / HR / CSR contact" /></label>
              <label><span>Website</span><input name="companyWebsite" maxLength={500} type="url" placeholder="https://…" /></label>
              <label><span>Sector</span><input name="sector" maxLength={120} placeholder="Technology / Manufacturing / Healthcare / Finance…" /></label>
              <div><span className="muted" style={{ fontSize: 12 }}>Eligible cohort</span><div className="tagRow" style={{ marginTop: 8 }}><label className="tag"><input type="checkbox" name="targetGrades" value="11" /> Grade 11</label><label className="tag"><input type="checkbox" name="targetGrades" value="12" /> Grade 12</label></div></div>
              <div><span className="muted" style={{ fontSize: 12 }}>Requested collaboration</span><div className="tagRow" style={{ marginTop: 8 }}>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="career_talk" /> Career talk</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="role_profiles" /> Role profiles</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="skills_briefing" /> Skills briefing</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="work_simulation" /> Work simulation</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="project_brief" /> Student project brief</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="mentoring" /> Mentoring</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="site_visit" /> Site visit</label>
              </div></div>
              <label><span>What do you want students to understand?</span><textarea name="note" rows={4} maxLength={3000} placeholder="Keep this educational and do not include student personal data." /></label>
              <AgreementChecks />
              <button className="button primary" type="submit">Send secure company invitation</button>
            </form>
          </article>

          <div style={{ display: "grid", gap: 18 }}>
            <CompanyContactFinder />
            <article className="panel">
              <div className="eyebrow">Connection queue</div>
              <h2 className="workspaceTitle">Company requests</h2>
              {requests.length === 0 ? <Empty text="No company requests yet." /> : (
                <div className="workspaceList">
                  {requests.map((item) => (
                    <div className="workspaceRow" key={String(item.id)}>
                      <div>
                        <strong>{String(item.company_name)}</strong>
                        <div className="muted">{String(item.company_email || "No email")} · Grade {(Array.isArray(item.target_grades) ? item.target_grades : []).map(String).join(" & ") || "—"}</div>
                        <div className="muted">Delivery: {String(item.delivery_status)} · Company: {String(item.company_response_status)} · {new Date(String(item.created_at)).toLocaleDateString("en-GB")}</div>
                      </div>
                      <span className="pill">{String(item.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="eyebrow">Verified company network</div>
          <h2 className="workspaceTitle">Connect to an already verified company</h2>
          <p className="muted">Verified companies do not require a new cold invitation, but the Grade 11–12 restriction and school agreement still apply to every connection request.</p>
          {partners.length === 0 ? <Empty text="No verified companies are published yet." /> : (
            <div className="cardGrid">
              {partners.map((partner) => {
                const partnerRoles = roles.filter((role) => String(role.industry_partner_id) === String(partner.id));
                const connection = connectionByPartner.get(String(partner.id));
                return (
                  <article className="card" key={String(partner.id)}>
                    <span className="pill">{String(partner.sector || "Industry")}</span>
                    <h3>{String(partner.company_name)}</h3>
                    <p className="muted">{String(partner.overview_en || "Verified company career profile.")}</p>
                    {partnerRoles.slice(0, 4).map((role) => (
                      <div className="feedbackCard" key={String(role.id)}>
                        <strong>{String(role.title_en)}</strong>
                        <p className="muted" style={{ margin: "4px 0" }}>{String(role.summary_en || "")}</p>
                        <div className="tagRow">{(Array.isArray(role.skill_tags) ? role.skill_tags : []).map((skill) => <span className="tag" key={String(skill)}>{String(skill)}</span>)}</div>
                      </div>
                    ))}
                    {connection ? <span className="pill">{String(connection.status)} · Grade {(Array.isArray(connection.target_grades) ? connection.target_grades : []).map(String).join(" & ")}</span> : (
                      <form action={requestVerifiedCompany} className="workspaceForm">
                        <input type="hidden" name="organizationId" value={organizationId} />
                        <input type="hidden" name="industryPartnerId" value={String(partner.id)} />
                        <div className="tagRow"><label className="tag"><input type="checkbox" name="targetGrades" value="11" /> Grade 11</label><label className="tag"><input type="checkbox" name="targetGrades" value="12" /> Grade 12</label></div>
                        <input name="requestNote" maxLength={1000} placeholder="Optional educational request note" />
                        <AgreementChecks />
                        <button className="button soft" type="submit">Request Grade 11–12 connection</button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FeatureGate({ organizationName }: { organizationName: string }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>VinaSkillTrust Junior</span></Link></header><div className="workspaceContent"><section className="panel gatePanel"><div className="eyebrow">{organizationName}</div><h2>Feature access not enabled</h2><p className="muted">A ViTech platform administrator must enable VinaSkillTrust Junior / School ↔ Company for this institution before company requests can be created.</p><Link className="button soft" href="/workspace/partner">Back to Partner Workspace</Link></section></div></main>;
}

function Gate({ signedIn = false }: { signedIn?: boolean }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>VinaSkillTrust Junior</span></Link></header><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Partner access required" : "Sign in required"}</h2><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/partner/industry-connect")}`}>Sign in</Link></section></div></main>;
}
function Empty({ text }: { text: string }) { return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>; }
