import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";
import { platformAiRuntime } from "@/lib/platform-ai-runtime";
import StudyLabClient from "./StudyLabClient";

export const dynamic = "force-dynamic";

export default async function AiStudyPage() {
  const user = await getSessionUser();
  if (!user) return <Gate copy="Sign in with your learner account to open Professor Vi." />;

  const profile = await getCurrentProfile();
  if (!profile || profile.account_type !== "student" || profile.status !== "active") {
    return <Gate copy="An active learner account is required." />;
  }
  if (!isRiskyFeatureEnabled("professorViAiStudy")) {
    return <Gate copy="Professor Vi is built behind the Phase A rollout switch and remains off until the production gates authorize it." />;
  }

  const sql = getDb();
  const schema = await sql`
    select
      to_regclass('public.professor_vi_policies') as policy_table,
      to_regclass('public.ai_study_sources') as source_table,
      to_regclass('public.ai_study_packs') as pack_table
  `;
  if (!schema[0]?.policy_table || !schema[0]?.source_table || !schema[0]?.pack_table) {
    return <Gate copy="Professor Vi migration 015 is prepared but is not active in this environment yet." />;
  }

  const organizations = await sql`
    select o.id, o.name, odp.ai_mode
    from organization_memberships om
    join organizations o on o.id=om.organization_id and o.status='active'
    join organization_features f
      on f.organization_id=o.id
     and f.feature_key='professor_vi_ai_study_lab'
     and f.enabled=true
    join professor_vi_policies p
      on p.organization_id=o.id
     and p.enabled=true
    left join organization_data_policies odp on odp.organization_id=o.id
    where om.profile_id=${profile.id}
      and om.role='student'
      and om.status='active'
    order by o.name
  `;
  const organization = organizations[0];
  if (!organization) return <Gate copy="Your school has not enabled Professor Vi for this learner account." />;

  const organizationId = String(organization.id);
  const consent = await sql`
    select id
    from learner_consent_records
    where learner_id=${profile.id}
      and organization_id=${organizationId}
      and consent_type='ai_assistive_features'
      and status='active'
      and revoked_at is null
    order by captured_at desc
    limit 1
  `;

  const runtime = platformAiRuntime();
  const aiMode = String(organization.ai_mode || "off");
  const ready = Boolean(consent[0]) && aiMode === "platform_managed" && runtime.mode === "openai";
  const readinessMessage = !consent[0]
    ? "The institution must record the required AI-assistive-feature consent before learner AI can run."
    : aiMode !== "platform_managed"
      ? "The institution has not selected the platform-managed Professor Vi runtime. BYOK remains a separate fail-closed boundary until its secret runtime is connected."
      : runtime.mode !== "openai"
        ? "Live platform AI is disabled in this deployment. No learner request will silently fall back to fake AI."
        : "Ready.";

  const sources = await sql`
    select id, title, source_type, original_filename, created_at
    from ai_study_sources
    where learner_id=${profile.id}
      and organization_id=${organizationId}
      and status='ready'
      and (expires_at is null or expires_at > now())
    order by created_at desc
    limit 30
  `;
  const packs = await sql`
    select id, pack_type, title, review_status,
      case when review_status='released' then content else '{}'::jsonb end as content,
      grounding_refs, created_at
    from ai_study_packs
    where learner_id=${profile.id}
      and organization_id=${organizationId}
      and review_status in ('pending_review','approved','released','changes_requested')
    order by created_at desc
    limit 30
  `;

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>Professor Vi</strong><div className="muted" style={{ fontSize: 12 }}>AI Study Lab · guided learning</div></div>
        <Link className="pill" href="/workspace/student">Student Workspace</Link>
      </header>
      <div className="workspaceContent">
        <StudyLabClient
          organizationId={organizationId}
          organizationName={String(organization.name)}
          sources={sources.map((row) => ({
            id: String(row.id),
            title: String(row.title),
            source_type: String(row.source_type),
            original_filename: row.original_filename ? String(row.original_filename) : null,
            created_at: row.created_at ? String(row.created_at) : undefined,
          }))}
          packs={packs.map((row) => ({
            id: String(row.id),
            pack_type: String(row.pack_type),
            title: String(row.title),
            review_status: String(row.review_status),
            content: row.content && typeof row.content === "object" ? row.content as { contentMarkdown?: string } : null,
            grounding_refs: Array.isArray(row.grounding_refs) ? row.grounding_refs as Array<{ label?: string; locator?: string | null; note?: string | null }> : [],
            created_at: row.created_at ? String(row.created_at) : undefined,
          }))}
          ready={ready}
          readinessMessage={readinessMessage}
        />
      </div>
    </main>
  );
}

function Gate({ copy }: { copy: string }) {
  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <strong>Professor Vi · AI Study Lab</strong>
        <Link className="pill" href="/workspace/student">Student Workspace</Link>
      </header>
      <div className="workspaceContent">
        <section className="panel gatePanel">
          <h2>Professor Vi</h2>
          <p className="muted">{copy}</p>
        </section>
      </div>
    </main>
  );
}
