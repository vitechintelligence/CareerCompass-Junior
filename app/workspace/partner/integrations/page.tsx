import Link from "next/link";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { integrationStandards, listIntegrationProviders, listOrganizationIntegrations } from "@/lib/integrations";
import IntegrationActions from "./IntegrationActions";
import CustomIntegrationRequestForm from "./CustomIntegrationRequestForm";
import { runAdapterDiagnostic } from "@/lib/integration-diagnostics";

export const dynamic = "force-dynamic";

export default async function PartnerIntegrationsPage() {
  const user = await getSessionUser();
  if (!user) return <Gate title="Sign in required" copy="Sign in with an approved partner account to manage integrations." />;

  const profile = await getCurrentProfile();
  if (!profile || !["partner_admin", "platform_admin"].includes(profile.account_type)) {
    return <Gate title="Partner access required" copy="Integrations are organization-scoped and are available only to approved partner administrators." />;
  }

  const sql = getDb();
  const organizations = profile.account_type === "platform_admin"
    ? await sql`select id, name from organizations where status='active' order by name`
    : await sql`
        select o.id, o.name
        from organization_memberships om
        join organizations o on o.id = om.organization_id
        where om.profile_id = ${profile.id}
          and om.role = 'partner_admin'
          and om.status = 'active'
          and o.status = 'active'
        order by o.name
      `;

  const organization = organizations[0];
  if (!organization) return <Gate title="No organization assigned" copy="Your partner account is not attached to an active school or training center yet." />;

  const organizationId = String(organization.id);
  const [providers, installations, requestRows] = await Promise.all([
    listIntegrationProviders(),
    listOrganizationIntegrations(organizationId),
    sql`
      select id, provider_name, status, created_at
      from integration_provider_requests
      where organization_id=${organizationId}
      order by created_at desc
      limit 8
    `,
  ]);

  const categories = Array.from(new Set(providers.map((provider) => provider.category)));
  const diagnostics = providers.map((provider) => ({ slug: provider.slug, ...runAdapterDiagnostic(provider.slug) }));
  const healthyAdapters = diagnostics.filter((item) => item.ok).length;
  const healthyInstallations = installations.filter((item) => String(item.health_state) === "healthy").length;
  const unhealthyInstallations = installations.filter((item) => ["degraded", "error"].includes(String(item.health_state))).length;

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brandMark">CC</span><span>Career Compass Junior</span></Link>
        <div><strong>Integration Hub</strong><div className="muted" style={{ fontSize: 12 }}>LMS · SIS · modules · third-party apps</div></div>
        <Link className="pill" href="/workspace/partner">Partner Workspace</Link>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div><div className="eyebrow">{String(organization.name)}</div><h1 className="workspaceHeroTitle">Connect what your school already uses.</h1><p className="muted">The adapter layer translates external systems into Career Compass canonical people, classes, enrollments and learning events. Your LMS or school portal remains usable; Career Compass does not require a rip-and-replace migration.</p></div>
          <span className="pill">{providers.length} connector profiles</span>
        </section>

        <section className="metricGrid">
          <Metric label="Installed" value={String(installations.length)} detail="Organization connectors" />
          <Metric label="Standards" value={String(integrationStandards.length)} detail="Interoperability paths" />
          <Metric label="Providers" value={String(providers.length)} detail="Available + beta" />
          <Metric label="Adapter core" value={`${healthyAdapters}/${providers.length}`} detail="Normalization + secret-scrubbing checks" />
        </section>

        <section className="panel">
          <div className="eyebrow">System health</div>
          <h2 className="workspaceTitle">Integration adapter health</h2>
          <div className="miniGrid">
            <div className="miniCard light"><strong>{healthyAdapters === providers.length ? "Healthy" : "Review"}</strong><span>{healthyAdapters}/{providers.length} provider profiles pass canonical diagnostics</span></div>
            <div className="miniCard light"><strong>{String(healthyInstallations)}</strong><span>healthy installed connections</span></div>
            <div className="miniCard light"><strong>{String(unhealthyInstallations)}</strong><span>degraded / error installed connections</span></div>
            <div className="miniCard light"><strong>{String(requestRows.length)}</strong><span>recent custom connector requests</span></div>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>The built-in diagnostic validates canonical people/classes/enrollments/events and recursively scrubs credential-like fields. Provider authorization and live external API health are checked separately once a real connection is configured.</p>
        </section>

        <section className="panel">
          <div className="eyebrow">Adapter architecture</div>
          <h2 className="workspaceTitle">External system → adapter → Career Compass core</h2>
          <div className="miniGrid">
            <div className="miniCard light"><strong>1</strong><span>Authenticate / receive data</span></div>
            <div className="miniCard light"><strong>2</strong><span>Normalize IDs, roles and objects</span></div>
            <div className="miniCard light"><strong>3</strong><span>Map to classes, profiles and evidence</span></div>
            <div className="miniCard light"><strong>4</strong><span>Sync safely with audit + health state</span></div>
          </div>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Open standards</div><h2 className="workspaceTitle">Portable by design</h2>
            <div className="workspaceList">
              {integrationStandards.map((standard) => <div className="workspaceRow" key={standard.name}><div><strong>{standard.name}</strong><div className="muted">{standard.purpose}</div></div><span className="pill">{standard.examples}</span></div>)}
            </div>
          </article>

          <article className="panel">
            <div className="eyebrow">Current organization</div><h2 className="workspaceTitle">Installed connections</h2>
            {installations.length === 0 ? <div className="emptyState"><span>◎</span><p className="muted">No connector slot has been prepared yet. Choose a provider below to create one safely.</p></div> : <div className="workspaceList">{installations.map((item) => <div className="workspaceRow" key={String(item.id)}><div><strong>{String(item.display_label || item.provider_name)}</strong><div className="muted">{String(item.provider_name)} · {String(item.protocol)}</div></div><span className="pill">{String(item.health_state)} · {String(item.status)}</span></div>)}</div>}
          </article>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Request any app</div>
            <h2 className="workspaceTitle">Need a connector that is not listed?</h2>
            <p className="muted">Tell ViTech which third-party app, school module or content platform you want connected. We review its API/standard, data boundaries and safest adapter path before activation.</p>
            <CustomIntegrationRequestForm organizationId={organizationId} />
          </article>
          <article className="panel">
            <div className="eyebrow">Recent requests</div>
            <h2 className="workspaceTitle">Connector request queue</h2>
            {requestRows.length === 0 ? <div className="emptyState"><span>◎</span><p className="muted">No custom connector requests yet.</p></div> : (
              <div className="workspaceList">
                {requestRows.map((item) => <div className="workspaceRow" key={String(item.id)}><div><strong>{String(item.provider_name)}</strong><div className="muted">{new Date(String(item.created_at)).toLocaleDateString("en-GB")}</div></div><span className="pill">{String(item.status)}</span></div>)}
              </div>
            )}
          </article>
        </section>

        {categories.map((category) => (
          <section className="panel" key={category}>
            <div className="eyebrow">{category}</div><h2 className="workspaceTitle">{category.toUpperCase()} connectors</h2>
            <div className="cardGrid">
              {providers.filter((provider) => provider.category === category).map((provider) => (
                <article className="card" key={provider.id}>
                  <span className="pill">{provider.protocol} · {provider.status}</span>
                  <h3>{provider.displayName}</h3>
                  <p className="muted">{provider.descriptionEn || "Standards-based integration profile."}</p>
                  <div className="tagRow">{provider.capabilities.map((capability) => <span className="tag" key={capability}>{capability.replaceAll("_", " ")}</span>)}</div>
                  <IntegrationActions organizationId={organizationId} providerSlug={provider.slug} providerName={provider.displayName} capabilities={provider.capabilities} />
                  <p className="muted" style={{ fontSize: 12 }}>Secrets are never collected by this browser action. OAuth, LTI keys and API credentials remain part of provider-specific server authorization.</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Gate({ title, copy }: { title: string; copy: string }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><span className="brandMark">CC</span><span>Career Compass Junior</span></Link><strong>Integration Hub</strong><Link className="pill" href="/workspace/partner">Partner Workspace</Link></header><div className="workspaceContent"><section className="panel gatePanel"><h1>{title}</h1><p className="muted">{copy}</p><div className="actions"><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/partner/integrations")}`}>Sign in</Link></div></section></div></main>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="metric"><span className="muted">{label}</span><strong>{value}</strong><span className="muted">{detail}</span></div>; }
