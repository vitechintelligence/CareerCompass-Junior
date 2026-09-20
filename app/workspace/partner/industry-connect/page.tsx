import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { requestCompanyConnection, requestVerifiedCompany } from "./actions";

export const dynamic = "force-dynamic";

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
      select c.industry_partner_id, c.status, p.company_name
      from school_company_connections c
      join industry_partners p on p.id=c.industry_partner_id
      where c.organization_id=${organizationId}
      order by c.updated_at desc
    `,
    sql`
      select id, company_name, company_website, sector, collaboration_types, status, created_at
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
        <div><strong>School ↔ Company Connector</strong><div className="muted" style={{ fontSize: 12 }}>Career exposure · role profiles · skill signals · real-work context</div></div>
        <Link className="pill" href="/workspace/partner">Partner Workspace</Link>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">{String(organization.name)}</div>
            <h1 className="workspaceHeroTitle">Connect students with companies, roles and the skills behind real work.</h1>
            <p className="muted">Schools can request company connections for career talks, role profiles, skills briefings, project briefs, work simulations, mentoring or site visits. Company content is surfaced to students only after the connection and profile are approved.</p>
          </div>
          <span className="pill">{connections.filter((item) => String(item.status) === "active").length} active company links</span>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Request a company</div>
            <h2 className="workspaceTitle">Who should your students learn from?</h2>
            <form action={requestCompanyConnection} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label><span>Company name</span><input name="companyName" maxLength={180} required placeholder="Company or employer" /></label>
              <label><span>Website</span><input name="companyWebsite" maxLength={500} type="url" placeholder="https://…" /></label>
              <label><span>Sector</span><input name="sector" maxLength={120} placeholder="Technology / Manufacturing / Healthcare / Finance…" /></label>
              <div><span className="muted" style={{ fontSize: 12 }}>What connection would be useful?</span><div className="tagRow" style={{ marginTop: 8 }}>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="career_talk" /> Career talk</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="role_profiles" /> Role profiles</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="skills_briefing" /> Skills briefing</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="work_simulation" /> Work simulation</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="project_brief" /> Student project brief</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="mentoring" /> Mentoring</label>
                <label className="tag"><input type="checkbox" name="collaborationTypes" value="site_visit" /> Site visit</label>
              </div></div>
              <label><span>What do you want students to understand?</span><textarea name="note" rows={4} maxLength={3000} placeholder="Example: software roles, English communication expectations, entry-level skills and a realistic project brief." /></label>
              <button className="button primary" type="submit">Request company connection</button>
            </form>
          </article>

          <article className="panel">
            <div className="eyebrow">Request queue</div>
            <h2 className="workspaceTitle">Your company requests</h2>
            {requests.length === 0 ? <Empty text="No company requests yet." /> : (
              <div className="workspaceList">
                {requests.map((item) => <div className="workspaceRow" key={String(item.id)}><div><strong>{String(item.company_name)}</strong><div className="muted">{String(item.sector || "Sector not set")} · {new Date(String(item.created_at)).toLocaleDateString("en-GB")}</div></div><span className="pill">{String(item.status)}</span></div>)}
              </div>
            )}
          </article>
        </section>

        <section className="panel">
          <div className="eyebrow">Verified company network</div>
          <h2 className="workspaceTitle">Company profiles available for school connection</h2>
          {partners.length === 0 ? <Empty text="No verified companies are published yet. Use the request form above; ViTech can onboard a company profile after verification and agreement." /> : (
            <div className="cardGrid">
              {partners.map((partner) => {
                const partnerRoles = roles.filter((role) => String(role.industry_partner_id) === String(partner.id));
                const connection = connectionByPartner.get(String(partner.id));
                return (
                  <article className="card" key={String(partner.id)}>
                    <span className="pill">{String(partner.sector || "Industry")}</span>
                    <h3>{String(partner.company_name)}</h3>
                    <p className="muted">{String(partner.overview_en || "Verified company career profile.")}</p>
                    {partnerRoles.slice(0, 4).map((role) => <div className="feedbackCard" key={String(role.id)}><strong>{String(role.title_en)}</strong><p className="muted" style={{ margin: "4px 0" }}>{String(role.summary_en || "")}</p><div className="tagRow">{(Array.isArray(role.skill_tags) ? role.skill_tags : []).map((skill) => <span className="tag" key={String(skill)}>{String(skill)}</span>)}</div></div>)}
                    {connection ? <span className="pill">{String(connection.status)}</span> : (
                      <form action={requestVerifiedCompany} className="workspaceForm">
                        <input type="hidden" name="organizationId" value={organizationId} />
                        <input type="hidden" name="industryPartnerId" value={String(partner.id)} />
                        <input name="requestNote" maxLength={1000} placeholder="Optional request note" />
                        <button className="button soft" type="submit">Request connection</button>
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

function Gate({ signedIn = false }: { signedIn?: boolean }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>School ↔ Company Connector</strong></header><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Partner access required" : "Sign in required"}</h2><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/partner/industry-connect")}`}>Sign in</Link></section></div></main>;
}
function Empty({ text }: { text: string }) { return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>; }
