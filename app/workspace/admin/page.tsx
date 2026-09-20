import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getPlatformAdminContext, platformAdminEmailsForDisplay } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { defaultFeaturesForOrganization, PLATFORM_FEATURES } from "@/lib/platform-feature-catalog";
import { approvePartnerRequest, rejectPartnerRequest, runInstitutionBuild, setInstitutionSiteStatus } from "./actions";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.panel}>
            <div className={styles.eyebrow}>ViTech control plane</div>
            <h1>Platform administrator sign-in required</h1>
            <p className={styles.muted}>This workspace can approve institutions, allocate modules and trigger the LangGraph institution builder.</p>
            <Link className={`${styles.button} ${styles.buttonPrimary}`} href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/admin")}`}>Sign in as administrator</Link>
          </section>
        </div>
      </main>
    );
  }

  const sql = getDb();
  const [requestRows, organizationRows, featureRows, siteRows, runRows] = await Promise.all([
    sql`
      select r.id, r.organization_name, r.organization_type, r.status, r.created_at,
             p.semantic_id as requester_semantic_id, p.display_name as requester_name
      from partner_onboarding_requests r
      join profiles p on p.id = r.requester_profile_id
      where r.status = 'pending'
      order by r.created_at asc
    `,
    sql`
      select o.id, o.semantic_id, o.name, o.organization_type, o.locale, o.status,
             (select count(*)::int from organization_memberships om where om.organization_id=o.id and om.role='teacher' and om.status='active') as teacher_count,
             (select count(*)::int from organization_memberships om where om.organization_id=o.id and om.role='student' and om.status='active') as student_count,
             (select count(*)::int from classes c where c.organization_id=o.id and c.status='active') as class_count
      from organizations o
      where o.status = 'active'
      order by o.name
    `,
    sql`select organization_id, feature_key, enabled from organization_features order by organization_id, feature_key`,
    sql`select organization_id, slug, status, generated_at, updated_at from institution_sites`,
    sql`select id, organization_id, status, started_at, completed_at, error_message from workflow_runs where workflow_key='institution_white_label_builder' order by started_at desc limit 50`,
  ]);

  const featuresByOrganization = new Map<string, Map<string, boolean>>();
  for (const row of featureRows) {
    const organizationId = String(row.organization_id);
    if (!featuresByOrganization.has(organizationId)) featuresByOrganization.set(organizationId, new Map());
    featuresByOrganization.get(organizationId)?.set(String(row.feature_key), Boolean(row.enabled));
  }

  const sitesByOrganization = new Map(siteRows.map((row) => [String(row.organization_id), row]));
  const lastRunByOrganization = new Map<string, (typeof runRows)[number]>();
  for (const row of runRows) {
    const organizationId = String(row.organization_id || "");
    if (organizationId && !lastRunByOrganization.has(organizationId)) lastRunByOrganization.set(organizationId, row);
  }

  const publishedSites = siteRows.filter((row) => String(row.status) === "published").length;
  const completedRuns = runRows.filter((row) => String(row.status) === "completed").length;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}>
            <VitechMark />
            <div><strong>ViTech Training + Operations</strong><span>Platform Administration Control Plane</span></div>
          </Link>
          <div className={styles.adminBadge}>Administrator · {admin.email || admin.profile.semantic_id}</div>
        </header>

        <section className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>Operations command center · administrator controlled</div>
            <h1>Build each institution from one controlled LangGraph trigger.</h1>
            <p>Approve the partner first, choose exactly which capabilities ViTech will allocate, then trigger LangGraph. The graph applies the Vietnam education/privacy baseline, intelligence guardrails and generates the institution white-label page in draft mode for human review.</p>
          </div>
          <div className={styles.heroPanel}>
            <strong>LangGraph provisioning flow</strong>
            <div className={styles.graphSteps}>
              <div className={styles.graphStep}><b>1</b><span>Scope modules</span></div>
              <div className={styles.graphStep}><b>2</b><span>Apply guardrails</span></div>
              <div className={styles.graphStep}><b>3</b><span>Configure intelligence</span></div>
              <div className={styles.graphStep}><b>4</b><span>Build white-label page</span></div>
            </div>
            <div className={styles.small}>Admin allowlist: {platformAdminEmailsForDisplay().join(", ")}</div>
          </div>
        </section>

        <section className={styles.metrics}>
          <div className={styles.metric}><span>Pending partners</span><strong>{requestRows.length}</strong></div>
          <div className={styles.metric}><span>Active institutions</span><strong>{organizationRows.length}</strong></div>
          <div className={styles.metric}><span>Published white-label pages</span><strong>{publishedSites}</strong></div>
          <div className={styles.metric}><span>Completed LangGraph builds</span><strong>{completedRuns}</strong></div>
        </section>

        <section className={styles.grid}>
          <article className={styles.panel}>
            <div className={styles.eyebrow}>Controlled onboarding</div>
            <h2>Partner applications</h2>
            <p className={styles.muted}>No school or training center can self-promote into administrator access. Approval is a separate ViTech action.</p>
            {requestRows.length === 0 ? <div className={styles.empty}>No pending partner applications.</div> : (
              <div className={styles.requestList}>
                {requestRows.map((request) => (
                  <div className={styles.requestCard} key={String(request.id)}>
                    <div className={styles.cardTop}>
                      <div>
                        <strong>{String(request.organization_name)}</strong>
                        <div className={styles.small}>{String(request.organization_type).replaceAll("_", " ")} · {String(request.requester_name || request.requester_semantic_id)}</div>
                      </div>
                      <span className={`${styles.pill} ${styles.pillPending}`}>Pending</span>
                    </div>
                    <form className={styles.form}>
                      <input type="hidden" name="requestId" value={String(request.id)} />
                      <textarea className={styles.textarea} name="reviewNote" maxLength={500} placeholder="Optional internal review note" />
                      <div className={styles.actions}>
                        <button className={`${styles.button} ${styles.buttonPrimary}`} formAction={approvePartnerRequest}>Approve + create institution</button>
                        <button className={`${styles.button} ${styles.buttonDanger}`} formAction={rejectPartnerRequest}>Reject</button>
                      </div>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={styles.panel}>
            <div className={styles.eyebrow}>Institution deployment</div>
            <h2>Feature allocation + LangGraph build</h2>
            <p className={styles.muted}>Every module is controlled by ViTech. Intelligence stays assistive and human-reviewed; publishing the institution page remains a separate administrator action.</p>
            {organizationRows.length === 0 ? <div className={styles.empty}>Approve a partner to create the first institution.</div> : (
              <div className={styles.orgList}>
                {organizationRows.map((organization) => {
                  const organizationId = String(organization.id);
                  const allocation = featuresByOrganization.get(organizationId);
                  const defaults = new Set(defaultFeaturesForOrganization(String(organization.organization_type)));
                  const site = sitesByOrganization.get(organizationId);
                  const lastRun = lastRunByOrganization.get(organizationId);
                  const siteStatus = String(site?.status || "not-built");
                  return (
                    <div className={styles.orgCard} key={organizationId}>
                      <div className={styles.cardTop}>
                        <div>
                          <strong>{String(organization.name)}</strong>
                          <div className={styles.small}>{String(organization.organization_type).replaceAll("_", " ")} · {String(organization.class_count)} classes · {String(organization.teacher_count)} teachers · {String(organization.student_count)} learners</div>
                        </div>
                        <span className={`${styles.pill} ${siteStatus === "published" ? styles.pillLive : styles.pillDraft}`}>{siteStatus}</span>
                      </div>

                      <form action={runInstitutionBuild} className={styles.form}>
                        <input type="hidden" name="organizationId" value={organizationId} />
                        <details className={styles.featureDetails} open={!site}>
                          <summary>Allocate platform modules</summary>
                          <div className={styles.featureGrid}>
                            {PLATFORM_FEATURES.map((feature) => {
                              const checked = allocation?.has(feature.key) ? Boolean(allocation.get(feature.key)) : defaults.has(feature.key);
                              return (
                                <label className={styles.feature} key={feature.key}>
                                  <input type="checkbox" name="features" value={feature.key} defaultChecked={checked} />
                                  <span><strong>{feature.label}</strong><span>{feature.description}</span></span>
                                </label>
                              );
                            })}
                          </div>
                        </details>
                        <button className={`${styles.button} ${styles.buttonGraph}`} type="submit">Run LangGraph institution build</button>
                      </form>

                      <div className={styles.intelligenceBox}>
                        <strong>Intelligence layer</strong>
                        <small>Search · summarize · recommend can be enabled per institution. No autonomous role elevation, sensitive-trait inference, public publishing or high-stakes grading.</small>
                      </div>

                      {site && (
                        <div className={styles.form}>
                          <div className={styles.actions}>
                            <Link className={styles.button} href={`/institution/${String(site.slug)}`}>Open institution page</Link>
                            {siteStatus !== "published" ? (
                              <form action={setInstitutionSiteStatus}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="status" value="published" /><button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">Publish</button></form>
                            ) : (
                              <form action={setInstitutionSiteStatus}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="status" value="paused" /><button className={styles.button} type="submit">Pause</button></form>
                            )}
                          </div>
                          <div className={styles.small}>Last LangGraph run: {lastRun ? `${String(lastRun.status)} · ${new Date(String(lastRun.started_at)).toLocaleString("en-GB")}` : "none yet"}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
