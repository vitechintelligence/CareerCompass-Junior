import Link from "next/link";
import { notFound } from "next/navigation";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getPlatformAdminContext } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { PLATFORM_FEATURES } from "@/lib/platform-feature-catalog";
import styles from "./institution.module.css";

export const dynamic = "force-dynamic";

export default async function InstitutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sql = getDb();
  const rows = await sql`
    select s.organization_id, s.slug, s.display_name, s.locale, s.headline, s.summary, s.status,
           s.intelligence_profile, s.compliance_profile, s.generated_at,
           o.semantic_id, o.organization_type
    from institution_sites s
    join organizations o on o.id = s.organization_id
    where s.slug = ${slug}
    limit 1
  `;
  const site = rows[0];
  if (!site) notFound();

  const organizationId = String(site.organization_id);
  const status = String(site.status);
  let isAdminOrPartner = false;

  if (status !== "published") {
    const platformAdmin = await getPlatformAdminContext();
    isAdminOrPartner = Boolean(platformAdmin);
    if (!isAdminOrPartner) {
      const profile = await getCurrentProfile();
      if (profile) {
        const membership = await sql`
          select 1
          from organization_memberships
          where organization_id = ${organizationId}
            and profile_id = ${profile.id}
            and role = 'partner_admin'
            and status = 'active'
          limit 1
        `;
        isAdminOrPartner = Boolean(membership[0]);
      }
    }
    if (!isAdminOrPartner) notFound();
  }

  const [featureRows, totals] = await Promise.all([
    sql`
      select feature_key
      from organization_features
      where organization_id = ${organizationId} and enabled = true
      order by feature_key
    `,
    sql`
      select
        (select count(*)::int from classes c where c.organization_id=${organizationId} and c.status='active') as classes,
        (select count(*)::int from organization_memberships om where om.organization_id=${organizationId} and om.role='teacher' and om.status='active') as teachers,
        (select count(*)::int from organization_memberships om where om.organization_id=${organizationId} and om.role='student' and om.status='active') as learners,
        (select count(*)::int from assignments a join classes c on c.id=a.class_id where c.organization_id=${organizationId} and a.status='published') as assignments
    `,
  ]);

  const enabled = new Set(featureRows.map((row) => String(row.feature_key)));
  const featureCards = PLATFORM_FEATURES.filter((feature) => enabled.has(feature.key));
  const total = totals[0] || {};
  const intelligence = (site.intelligence_profile || {}) as {
    mode?: string;
    humanApprovalRequired?: boolean;
    capabilities?: { search?: boolean; summarize?: boolean; recommend?: boolean };
  };
  const compliance = (site.compliance_profile || {}) as Record<string, unknown>;
  const vi = String(site.locale) !== "en";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.browser}>
          <header className={styles.browserTop}>
            <div className={styles.dots}><span /><span /><span /></div>
            <strong>{String(site.display_name)} · Training + Operations</strong>
            <span className={styles.live}>{status === "published" ? "Live" : `${status} preview`}</span>
          </header>

          <div className={styles.app}>
            <aside className={styles.rail}>
              <div className={styles.railMark}><VitechMark /></div>
              <div className={`${styles.railDot} ${styles.railDotActive}`}>⌂</div>
              <div className={styles.railDot}>◎</div>
              <div className={styles.railDot}>↻</div>
              <div className={styles.railDot}>▥</div>
              <div className={styles.railDot}>⚙</div>
            </aside>

            <div className={styles.content}>
              <div className={styles.topline}>
                <div>
                  <div className={styles.eyebrow}>Institution operations command center</div>
                  <h1 className={styles.title}>{String(site.display_name)}</h1>
                  <strong>{String(site.headline)}</strong>
                  <p className={styles.summary}>{String(site.summary)}</p>
                </div>
                <div className={styles.actions}>
                  <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/workspace/partner">{vi ? "Không gian đối tác" : "Partner workspace"}</Link>
                  <Link className={styles.button} href="/portal/teacher">{vi ? "Giáo viên" : "Teacher"}</Link>
                  <Link className={styles.button} href="/portal/student">{vi ? "Học viên" : "Student"}</Link>
                </div>
              </div>

              <section className={styles.metrics}>
                <div className={styles.metric}><span>{vi ? "Lớp đang hoạt động" : "Active classes"}</span><strong>{String(total.classes || 0)}</strong></div>
                <div className={styles.metric}><span>{vi ? "Giáo viên" : "Teachers"}</span><strong>{String(total.teachers || 0)}</strong></div>
                <div className={styles.metric}><span>{vi ? "Học viên" : "Learners"}</span><strong>{String(total.learners || 0)}</strong></div>
                <div className={styles.metric}><span>{vi ? "Bài tập đã giao" : "Assignments"}</span><strong>{String(total.assignments || 0)}</strong></div>
              </section>

              <section className={styles.dashboard}>
                <div className={styles.card}>
                  <div className={styles.eyebrow}>Workflow automation</div>
                  <h2>{vi ? "Học tập, giao nhận và quy trình trong một nơi" : "Training, delivery & workflow in one view"}</h2>
                  <div className={styles.flow}>
                    <div className={styles.flowStep}><b>1</b><span>{vi ? "Ghi danh" : "Onboard"}</span></div>
                    <div className={styles.flowStep}><b>2</b><span>{vi ? "Học tập" : "Train"}</span></div>
                    <div className={styles.flowStep}><b>3</b><span>{vi ? "Xác minh" : "Validate"}</span></div>
                    <div className={styles.flowStep}><b>4</b><span>{vi ? "Minh chứng" : "Evidence"}</span></div>
                  </div>
                  <div className={styles.featureGrid}>
                    {featureCards.map((feature) => (
                      <div className={styles.feature} key={feature.key}>
                        <strong>{feature.label}</strong>
                        <span>{feature.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <aside className={`${styles.card} ${styles.intelligence}`}>
                  <div className={styles.eyebrow}>Intelligence layer</div>
                  <h3>{vi ? "Trí tuệ hỗ trợ, con người kiểm soát" : "Assistive intelligence, human controlled"}</h3>
                  <p>{vi ? "Lớp trí tuệ chỉ hoạt động trong những khả năng mà ViTech đã cấp cho tổ chức. Quyết định vai trò, công bố và hành động nhạy cảm vẫn thuộc về quản trị viên/giáo viên." : "The intelligence layer operates only within capabilities allocated by ViTech. Role decisions, publishing and sensitive actions remain with administrators and teachers."}</p>
                  <div className={styles.signal}><span>Search</span><span>{intelligence.capabilities?.search ? "ENABLED" : "OFF"}</span></div>
                  <div className={styles.signal}><span>Summarize</span><span>{intelligence.capabilities?.summarize ? "ENABLED" : "OFF"}</span></div>
                  <div className={styles.signal}><span>Recommend</span><span>{intelligence.capabilities?.recommend ? "ENABLED" : "OFF"}</span></div>
                </aside>
              </section>

              <section className={styles.dashboard} style={{ marginTop: 14 }}>
                <div className={styles.card}>
                  <div className={styles.eyebrow}>Visibility</div>
                  <h3>{vi ? "Theo dõi vận hành theo vai trò" : "Role-scoped operational visibility"}</h3>
                  <p className={styles.summary}>{vi ? "Tiến độ, điểm danh, bài tập, phản hồi và trạng thái triển khai được giữ trong phạm vi tổ chức và vai trò được cấp." : "Progress, attendance, assignments, feedback and delivery status stay within allocated organization and role boundaries."}</p>
                </div>

                <div className={styles.card}>
                  <div className={styles.eyebrow}>Security + continuity</div>
                  <h3>{vi ? "Ranh giới riêng tư và kiểm soát" : "Privacy boundaries + control"}</h3>
                  <div className={styles.guardrails}>
                    <div className={styles.guardrail}><b>✓</b><span>{vi ? "Phân quyền theo vai trò" : "Role-based access"}</span></div>
                    <div className={styles.guardrail}><b>✓</b><span>{vi ? "Giảm thiểu dữ liệu trẻ em" : "Child-data minimization"}</span></div>
                    <div className={styles.guardrail}><b>✓</b><span>{vi ? "Nhật ký hành động quản trị" : "Administrative audit trail"}</span></div>
                    <div className={styles.guardrail}><b>✓</b><span>{vi ? "Kiểm soát lưu giữ và xuất bản" : "Retention + publishing controls"}</span></div>
                    <div className={styles.guardrail}><b>✓</b><span>{String(compliance.humanControlledPublishing ?? true) === "true" ? (vi ? "Xuất bản do con người kiểm soát" : "Human-controlled publishing") : "Controlled publishing"}</span></div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <footer className={styles.footer}>
            <span>{String(site.semantic_id)} · {String(site.organization_type).replaceAll("_", " ")}</span>
            <span>Powered by ViTech Intelligence Solutions · LangGraph provisioned</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
