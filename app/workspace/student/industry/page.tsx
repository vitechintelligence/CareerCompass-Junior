import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StudentIndustryPage() {
  const user = await getSessionUser();
  if (!user) return <Gate />;
  const profile = await getCurrentProfile();
  if (!profile || profile.account_type !== "student") return <Gate signedIn />;

  const sql = getDb();
  const companies = await sql`
    select distinct p.id, p.company_name, p.website, p.sector, p.overview_en, p.overview_vi
    from organization_memberships om
    join school_company_connections c on c.organization_id=om.organization_id and c.status='active'
    join industry_partners p on p.id=c.industry_partner_id and p.status='verified'
    where om.profile_id=${profile.id} and om.status='active'
    order by p.company_name
  `;

  const companyIds = companies.map((company) => String(company.id));
  const roles = companyIds.length === 0 ? [] : await sql`
    select id, industry_partner_id, title_en, title_vi, summary_en, summary_vi, skill_tags, education_notes_en, education_notes_vi, age_relevance
    from industry_roles
    where industry_partner_id = any(${companyIds}::uuid[])
      and status='published'
    order by title_en
  `;

  const vi = profile.preferred_locale === "vi";

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>{vi ? "Khám phá Công ty & Nghề nghiệp" : "Companies & Careers"}</strong><div className="muted" style={{ fontSize: 12 }}>{vi ? "Doanh nghiệp đã kết nối với trường" : "Companies connected to your school"}</div></div>
        <Link className="pill" href="/workspace/student">{vi ? "My Compass" : "My Compass"}</Link>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">School ↔ Company Connector</div>
            <h1 className="workspaceHeroTitle">{vi ? "Hiểu công ty làm gì, vai trò nào tồn tại và kỹ năng nào thực sự cần." : "See what companies do, which roles exist and what skills the work actually needs."}</h1>
            <p className="muted">{vi ? "Nội dung ở đây chỉ hiển thị khi nhà trường và doanh nghiệp đã được kết nối/duyệt trong hệ thống." : "Content appears here only after the school-company connection and company profile are approved in the platform."}</p>
          </div>
          <span className="pill">{companies.length} {vi ? "công ty" : "companies"}</span>
        </section>

        {companies.length === 0 ? (
          <section className="panel"><div className="emptyState"><span>◎</span><p className="muted">{vi ? "Trường của bạn chưa có hồ sơ doanh nghiệp đang hoạt động." : "Your school does not have an active company profile connection yet."}</p></div></section>
        ) : (
          <div className="cardGrid">
            {companies.map((company) => {
              const companyRoles = roles.filter((role) => String(role.industry_partner_id) === String(company.id));
              return (
                <article className="card" key={String(company.id)}>
                  <span className="pill">{String(company.sector || (vi ? "Doanh nghiệp" : "Industry"))}</span>
                  <h2>{String(company.company_name)}</h2>
                  <p className="muted">{vi ? String(company.overview_vi || company.overview_en || "") : String(company.overview_en || company.overview_vi || "")}</p>
                  {companyRoles.length === 0 ? <p className="muted">{vi ? "Hồ sơ vai trò đang được bổ sung." : "Role profiles are being prepared."}</p> : (
                    <div className="workspaceList">
                      {companyRoles.map((role) => (
                        <div className="feedbackCard" key={String(role.id)}>
                          <strong>{vi ? String(role.title_vi) : String(role.title_en)}</strong>
                          <p className="muted" style={{ margin: "4px 0 8px" }}>{vi ? String(role.summary_vi || "") : String(role.summary_en || "")}</p>
                          <div className="tagRow">{(Array.isArray(role.skill_tags) ? role.skill_tags : []).map((skill) => <span className="tag" key={String(skill)}>{String(skill)}</span>)}</div>
                          {(vi ? role.education_notes_vi : role.education_notes_en) && <p className="muted" style={{ marginTop: 8 }}><b>{vi ? "Chuẩn bị:" : "How to prepare:"}</b> {vi ? String(role.education_notes_vi) : String(role.education_notes_en)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {company.website && <a className="button soft" href={String(company.website)} target="_blank" rel="noreferrer">{vi ? "Trang doanh nghiệp" : "Company website"} ↗</a>}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function Gate({ signedIn = false }: { signedIn?: boolean }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Companies & Careers</strong></header><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Student access required" : "Sign in required"}</h2><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/student/industry")}`}>Sign in</Link></section></div></main>;
}
