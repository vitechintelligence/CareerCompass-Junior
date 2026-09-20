import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { updateOrganizationDataPolicy } from "@/app/workspace/community/actions";

export const dynamic = "force-dynamic";

type PolicyRow = {
  evidence_storage_mode?: string;
  ai_mode?: string;
  ai_provider?: string | null;
  byok_configured?: boolean;
  vng_status?: string;
  observability_mode?: string;
  raw_student_content_tracing?: boolean;
  partner_acknowledged_data_responsibility?: boolean;
};

export default async function PartnerDataControlPage() {
  const user = await getSessionUser();
  if (!user) return <Gate copy="Sign in with an approved partner administrator account." />;

  const profile = await getCurrentProfile();
  if (!profile || !["partner_admin","platform_admin"].includes(profile.account_type)) {
    return <Gate copy="School administrator access is required to choose institution data and AI modes." />;
  }

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
  if (!organization) return <Gate copy="No active institution is attached to this administrator account." />;
  const organizationId = String(organization.id);

  let policy: PolicyRow | null = null;
  let schemaReady = true;
  try {
    const ready = await sql`select to_regclass('public.organization_data_policies') as table_name`;
    schemaReady = Boolean(ready[0]?.table_name);
    if (schemaReady) {
      const rows = await sql`
        select evidence_storage_mode, ai_mode, ai_provider, byok_configured,
          vng_status, observability_mode, raw_student_content_tracing,
          partner_acknowledged_data_responsibility
        from organization_data_policies
        where organization_id=${organizationId}
        limit 1
      `;
      policy = (rows[0] as PolicyRow | undefined) ?? null;
    }
  } catch {
    schemaReady = false;
  }

  const storageMode = String(policy?.evidence_storage_mode || "platform_metadata");
  const aiMode = String(policy?.ai_mode || "off");
  const observabilityMode = String(policy?.observability_mode || "metadata_only");

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/workspace/partner"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>Institution Data & AI Control</strong><div className="muted" style={{ fontSize: 12 }}>School-controlled choices · no silent AI enablement</div></div>
        <Link className="pill" href="/workspace/partner">Partner Workspace</Link>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">Institution control plane</div>
            <h1 className="workspaceHeroTitle">{String(organization.name)}</h1>
            <p className="muted">Choose how learning evidence, optional AI and technical observability should operate for your institution. These settings never grant a model permission to make high-stakes student decisions.</p>
          </div>
          <span className="pill">{storageMode.replaceAll("_"," ")} · AI {aiMode.replaceAll("_"," ")}</span>
        </section>

        {!schemaReady && <section className="statusBanner"><strong>Configuration schema is prepared but not active yet.</strong><span>Migration 005 must be reviewed and explicitly approved before these controls can be saved in production.</span></section>}

        <section className="panel">
          <div className="eyebrow">Evidence & storage choice</div>
          <h2 className="workspaceTitle">Where should student evidence live?</h2>
          <div className="communityShowcaseGrid">
            <OptionCard title="Intelligence Capsule · school-controlled" badge="Recommended for institution control" active={storageMode === "school_capsule"} copy="Use a school-controlled Capsule destination for richer learner evidence. The target design keeps only the minimum platform references/hashes needed for workflow and verification. A storage connector must be configured before this mode can become fully externalized." />
            <OptionCard title="VNG Cloud · Vietnam-localized" badge="Paid cloud option" active={storageMode === "vng_cloud"} copy="Request a Vietnam-hosted data path using VNG Cloud. Infrastructure, storage and AI charges remain subject to VNG Cloud's own commercial terms. Selecting this creates a setup request; it does not silently provision paid resources." />
            <OptionCard title="Local browser" badge="Device-first" active={storageMode === "local_browser"} copy="Keep supported practice state on the learner device. Best for lightweight/offline activities. Cross-device recovery, teacher reporting and collaborative features are limited unless the school later synchronizes selected evidence." />
            <OptionCard title="Manual" badge="No AI required" active={storageMode === "manual"} copy="Teachers manage evidence and feedback manually. Community and STEAM activities can still run without live AI." />
            <OptionCard title="Platform metadata" badge="Current operational baseline" active={storageMode === "platform_metadata"} copy="Career Compass keeps the operational records required for authentication, class membership, progress and selected evidence metadata in the platform database. This is not a claim that ViTech stores no data." />
          </div>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Configure storage + AI</div>
            <h2 className="workspaceTitle">Administrator selection</h2>
            <form action={updateOrganizationDataPolicy} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label><span>Evidence storage mode</span><select name="storageMode" defaultValue={storageMode}>
                <option value="platform_metadata">Platform metadata baseline</option>
                <option value="school_capsule">School-controlled Intelligence Capsule</option>
                <option value="vng_cloud">VNG Cloud localization request</option>
                <option value="local_browser">Local browser / device-first</option>
                <option value="manual">Manual school-managed workflow</option>
              </select></label>
              <label><span>Live AI mode</span><select name="aiMode" defaultValue={aiMode}>
                <option value="off">Off / manual</option>
                <option value="byok">BYOK · school supplies provider key</option>
                <option value="local_browser">Local browser AI when supported</option>
              </select></label>
              <label><span>AI provider label (no secret keys here)</span><input name="aiProvider" defaultValue={String(policy?.ai_provider || "")} maxLength={80} placeholder="OpenAI / Gemini / local model / other" /></label>
              <label><span>Technical observability</span><select name="observabilityMode" defaultValue={observabilityMode}>
                <option value="metadata_only">LangSmith-compatible metadata-only diagnostics</option>
                <option value="disabled">Disabled for this institution</option>
                <option value="self_hosted">Institution-controlled / self-hosted observability</option>
              </select></label>
              <label className="communityCheck"><input type="checkbox" name="acknowledge" defaultChecked={Boolean(policy?.partner_acknowledged_data_responsibility)} required /><span>I understand that the institution remains responsible for its notices, permissions, moderation, retention decisions and lawful use of student information, while ViTech remains responsible for obligations that apply to the platform services it actually performs.</span></label>
              <button className="button primary" type="submit" disabled={!schemaReady}>Save institution policy</button>
            </form>
          </article>

          <article className="panel">
            <div className="eyebrow">Live AI · BYOK</div>
            <h2 className="workspaceTitle">The school controls whether AI is used.</h2>
            <p className="muted">BYOK means the institution chooses the model provider and supplies its own key through a secure secret configuration path. Raw keys must never be written into the Career Compass application database, community posts or learner records.</p>
            <div className="miniGrid">
              <div className="miniCard light"><strong>AI Off</strong><span>Everything remains teacher/manual where possible.</span></div>
              <div className="miniCard light"><strong>BYOK</strong><span>Optional live AI with institution-selected provider and spending controls.</span></div>
              <div className="miniCard light"><strong>Local browser</strong><span>Supported local models can run without sending the task to a remote provider.</span></div>
              <div className="miniCard light"><strong>Human control</strong><span>No autonomous grading, diagnosis or fixed career prediction.</span></div>
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="eyebrow">When CTAs appear</div>
          <h2 className="workspaceTitle">Only show configuration prompts when they are relevant.</h2>
          <div className="workspaceList">
            <CtaRow when="Before the first community season opens" cta="Review Community Terms + choose data mode" reason="The school should make governance and storage choices before students enter the community." />
            <CtaRow when="When a partner enables Intelligence Capsule evidence" cta="Choose school-controlled Capsule / VNG Cloud / platform metadata" reason="Evidence location should be an explicit institution choice." />
            <CtaRow when="When an AI-assisted feature is turned on" cta="Configure BYOK or choose Local Browser" reason="No model call should start just because a feature card was clicked." />
            <CtaRow when="When VNG Cloud is selected" cta="Request VNG setup · review VNG fees/terms" reason="Paid infrastructure must require an affirmative setup step." />
            <CtaRow when="After repeated system errors or failed AI workflows" cta="Open Technical Support Diagnostics" reason="Administrators can expose safe technical trace IDs and error metadata without exposing raw student work." />
            <CtaRow when="Manual mode is selected" cta="No AI CTA during normal learning" reason="The school can stay fully manual; an unobtrusive 'Explore assisted options' link can remain in administrator settings." />
          </div>
        </section>

        <section className="panel">
          <div className="eyebrow">LangSmith / technical operations</div>
          <h2 className="workspaceTitle">Observability is support tooling — not the tenant isolation boundary.</h2>
          <p className="muted">Student isolation must be enforced by Career Compass authorization, organization-scoped database queries, role checks and storage boundaries. LangSmith can support traces, evaluations, alerts and model-gateway controls, but it must not be treated as the mechanism that prevents one school's data from appearing in another school's workspace.</p>
          <div className="statusBanner"><strong>Default trace policy: metadata only.</strong><span>Raw learner responses, names, emails, recordings, project content and BYOK secrets should not be traced. Use organization-safe identifiers, route/workflow name, error class, latency, model/provider label and a trace ID for support.</span></div>
        </section>
      </div>
    </main>
  );
}

function OptionCard({ title, badge, copy, active }: { title: string; badge: string; copy: string; active: boolean }) {
  return <article className={`communityShowcaseCard ${active ? "communityOptionActive" : ""}`}><span className="pill">{badge}</span><h3>{title}</h3><p className="muted">{copy}</p></article>;
}

function CtaRow({ when, cta, reason }: { when: string; cta: string; reason: string }) {
  return <div className="workspaceRow"><div><strong>{when}</strong><div className="muted">{reason}</div></div><span className="pill">{cta}</span></div>;
}

function Gate({ copy }: { copy: string }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Institution Data & AI Control</strong><Link className="pill" href="/workspace/partner">Partner Workspace</Link></header><div className="workspaceContent"><section className="panel gatePanel"><h2>Administrator access required</h2><p className="muted">{copy}</p></section></div></main>;
}
