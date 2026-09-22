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
    where om.profile_id=${profile.id}
      and om.status='active'
      and exists (
        select 1
        from class_memberships cm
        join classes cl
          on cl.id=cm.class_id
         and cl.organization_id=om.organization_id
         and cl.status='active'
        where cm.student_id=${profile.id}
          and cm.status='active'
          and (
            ('11'=any(c.target_grades) and concat_ws(' ', cl.name, cl.level_label) ~* '(^|[^0-9])11([^0-9]|$)')
            or
            ('12'=any(c.target_grades) and concat_ws(' ', cl.name, cl.level_label) ~* '(^|[^0-9])12([^0-9]|$)')
          )
      )
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

  const simulations = companyIds.length === 0 ? [] : await sql`
    select distinct
      s.id, s.industry_partner_id, s.company_name, s.title, s.summary, s.instructions,
      s.target_grades, s.safety_notes, s.published_at, s.created_at
    from organization_memberships om
    join school_company_connections c
      on c.organization_id=om.organization_id
     and c.status='active'
    join vst_junior_simulations s
      on s.organization_id=om.organization_id
     and s.industry_partner_id=c.industry_partner_id
     and s.status='published'
    join industry_partners p
      on p.id=s.industry_partner_id
     and p.status='verified'
    where om.profile_id=${profile.id}
      and om.status='active'
      and s.industry_partner_id = any(${companyIds}::uuid[])
      and exists (
        select 1
        from class_memberships cm
        join classes cl
          on cl.id=cm.class_id
         and cl.organization_id=om.organization_id
         and cl.status='active'
        where cm.student_id=${profile.id}
          and cm.status='active'
          and (
            (
              '11'=any(c.target_grades)
              and '11'=any(s.target_grades)
              and concat_ws(' ', cl.name, cl.level_label) ~* '(^|[^0-9])11([^0-9]|$)'
            )
            or
            (
              '12'=any(c.target_grades)
              and '12'=any(s.target_grades)
              and concat_ws(' ', cl.name, cl.level_label) ~* '(^|[^0-9])12([^0-9]|$)'
            )
          )
      )
    order by s.published_at desc nulls last, s.created_at desc
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
            <div className="eyebrow">VinaSkillTrust Junior · Grade 11–12</div>
            <h1 className="workspaceHeroTitle">{vi ? "Hiểu công ty làm gì, vai trò nào tồn tại và kỹ năng nào thực sự cần." : "See what companies do, which roles exist and what skills the work actually needs."}</h1>
            <p className="muted">{vi ? "Nội dung chỉ hiển thị cho học sinh thuộc lớp Khối 11 hoặc Khối 12 đủ điều kiện sau khi kết nối trường-doanh nghiệp, hồ sơ doanh nghiệp và mọi mô phỏng liên quan đã được phê duyệt." : "Content appears here only for learners in an eligible Grade 11 or Grade 12 class after the school-company connection, company profile and any simulation have passed the required approvals."}</p>
          </div>
          <span className="pill">{companies.length} {vi ? "công ty" : "companies"}</span>
        </section>

        {companies.length === 0 ? (
          <section className="panel"><div className="emptyState"><span>◎</span><p className="muted">{vi ? "Trường của bạn chưa có hồ sơ doanh nghiệp đang hoạt động." : "Your school does not have an active company profile connection yet."}</p></div></section>
        ) : (
          <div className="cardGrid">
            {companies.map((company) => {
              const companyRoles = roles.filter((role) => String(role.industry_partner_id) === String(company.id));
              const companySimulations = simulations.filter((simulation) => String(simulation.industry_partner_id) === String(company.id));
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
                  {companySimulations.length > 0 && (
                    <div className="workspaceList">
                      <div className="eyebrow">{vi ? "Mô phỏng đã được ViTech duyệt" : "ViTech-approved simulations"}</div>
                      {companySimulations.map((simulation) => (
                        <div className="feedbackCard" key={String(simulation.id)}>
                          <strong>{String(simulation.title)}</strong>
                          <p className="muted" style={{ margin: "5px 0 8px" }}>{String(simulation.summary)}</p>
                          <p className="muted" style={{ margin: "0 0 8px" }}><b>{vi ? "Nhiệm vụ:" : "Your brief:"}</b> {String(simulation.instructions)}</p>
                          <div className="tagRow">
                            {(Array.isArray(simulation.target_grades) ? simulation.target_grades : []).map((grade) => <span className="tag" key={String(grade)}>Grade {String(grade)}</span>)}
                          </div>
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
