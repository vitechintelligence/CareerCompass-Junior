import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";
import { saveProfessorViPolicy } from "./actions";

export const dynamic = "force-dynamic";

export default async function PartnerAiLearningPage() {
  const user = await getSessionUser();
  if (!user) return <Gate copy="Sign in with a school administrator account." />;
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active" || !["partner_admin","platform_admin"].includes(profile.account_type)) {
    return <Gate copy="School administrator access is required." />;
  }
  if (!isRiskyFeatureEnabled("professorViAiStudy")) {
    return <Gate copy="Professor Vi remains behind the Phase A rollout switch. Configuration becomes active only after the rollout gate is enabled." />;
  }

  const sql = getDb();
  const schema = await sql`select to_regclass('public.professor_vi_policies') as table_name`;
  if (!schema[0]?.table_name) return <Gate copy="Migration 015 is prepared but not active in this environment." />;

  const organizations = profile.account_type === "platform_admin"
    ? await sql`
        select o.id, o.name
        from organizations o
        join organization_features f on f.organization_id=o.id
        where o.status='active'
          and f.feature_key='professor_vi_ai_study_lab'
          and f.enabled=true
        order by o.name
      `
    : await sql`
        select o.id, o.name
        from organization_memberships om
        join organizations o on o.id=om.organization_id and o.status='active'
        join organization_features f
          on f.organization_id=o.id
         and f.feature_key='professor_vi_ai_study_lab'
         and f.enabled=true
        where om.profile_id=${profile.id}
          and om.role='partner_admin'
          and om.status='active'
        order by o.name
      `;
  const organization = organizations[0];
  if (!organization) return <Gate copy="ViTech platform administration must allocate the Professor Vi AI Study Lab feature to this institution first." />;

  const organizationId = String(organization.id);
  const rows = await sql`
    select p.*, odp.ai_mode
    from professor_vi_policies p
    left join organization_data_policies odp on odp.organization_id=p.organization_id
    where p.organization_id=${organizationId}
    limit 1
  `;
  const policy = rows[0];
  const allowedModes = Array.isArray(policy?.allowed_modes)
    ? policy.allowed_modes.map(String)
    : ["summary","study_guide","quiz","socratic","math_science"];
  const sourceTypes = Array.isArray(policy?.allowed_source_types)
    ? policy.allowed_source_types.map(String)
    : ["pdf","ppt","pptx","txt","md","doc","docx"];
  const maxMb = Math.max(1, Math.round(Number(policy?.max_source_bytes || 10485760) / 1024 / 1024));

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>Professor Vi · School Control</strong><div className="muted" style={{ fontSize: 12 }}>Instruction policy · learner AI governance</div></div>
        <Link className="pill" href="/workspace/partner">Partner Workspace</Link>
      </header>
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">School-admin controlled</div>
            <h1 className="workspaceHeroTitle">{String(organization.name)}</h1>
            <p className="muted">ViTech allocates the capability. Your institution decides whether learners may use it, what modes are available, how quickly answers may be revealed, whether generated packs require teacher review, and how long study sources remain available.</p>
          </div>
          <span className="pill">AI mode: {String(policy?.ai_mode || "off").replaceAll("_"," ")}</span>
        </section>

        <section className="statusBanner">
          <strong>Professor Vi is instructional intelligence, not an answer engine.</strong>
          <span>The deterministic policy layer controls answer release, permissions and escalation. AI may adapt the teaching move, but it cannot override institution policy.</span>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Learner AI policy</div>
            <h2 className="workspaceTitle">Configure Professor Vi</h2>
            <form action={saveProfessorViPolicy} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label className="communityCheck"><input type="checkbox" name="enabled" defaultChecked={Boolean(policy?.enabled)} /><span>Enable Professor Vi for eligible learners after consent</span></label>

              <fieldset>
                <legend>Allowed learning modes</legend>
                {[
                  ["summary","Grounded summaries"],
                  ["study_guide","Study guides"],
                  ["quiz","Custom quizzes"],
                  ["socratic","Socratic / guided tutoring"],
                  ["math_science","Personalized Math & Science support"],
                ].map(([key,label]) => <label className="communityCheck" key={key}><input type="checkbox" name="allowedModes" value={key} defaultChecked={allowedModes.includes(key)} /><span>{label}</span></label>)}
              </fieldset>

              <label><span>Answer-release policy</span><select name="answerReleaseStrictness" defaultValue={String(policy?.answer_release_strictness || "guided")}>
                <option value="guided">Guided · strongest attempt-first policy</option>
                <option value="balanced">Balanced · scaffold then explain</option>
                <option value="direct_when_stuck">Direct when clearly stuck</option>
              </select></label>

              <label><span>Intervention intensity</span><select name="interventionIntensity" defaultValue={String(policy?.intervention_intensity || "adaptive")}>
                <option value="light">Light</option>
                <option value="adaptive">Adaptive</option>
                <option value="high_support">High support</option>
              </select></label>

              <label className="communityCheck"><input type="checkbox" name="teacherReview" defaultChecked={policy ? Boolean(policy.require_teacher_review_generated_packs) : true} /><span>Require teacher review before generated study packs/quizzes are released</span></label>
              <label className="communityCheck"><input type="checkbox" name="allowSourceUploads" defaultChecked={policy ? Boolean(policy.allow_source_uploads) : true} /><span>Allow learner study-source uploads</span></label>

              <fieldset>
                <legend>Allowed source files</legend>
                {["pdf","ppt","pptx","doc","docx","txt","md"].map((type) => <label className="communityCheck" key={type}><input type="checkbox" name="sourceTypes" value={type} defaultChecked={sourceTypes.includes(type)} /><span>{type.toUpperCase()}</span></label>)}
              </fieldset>

              <label><span>Maximum source file (MB)</span><input type="number" name="maxSourceMb" min={1} max={50} defaultValue={maxMb} /></label>
              <label><span>Source retention (days)</span><input type="number" name="retentionDays" min={1} max={365} defaultValue={Number(policy?.retention_days || 30)} /></label>
              <label><span>Primary support language</span><select name="primaryLanguage" defaultValue={String(policy?.primary_language || "vi")}><option value="vi">Vietnamese</option><option value="en">English</option></select></label>
              <label><span>CEFR target (optional)</span><select name="cefrTarget" defaultValue={String(policy?.cefr_target || "")}><option value="">Use learner/class level</option>{["A1","A2","B1","B2","C1","C2"].map((level) => <option key={level} value={level}>{level}</option>)}</select></label>

              <button className="button primary" type="submit">Save Professor Vi policy</button>
            </form>
          </article>

          <article className="panel">
            <div className="eyebrow">Runtime boundary</div>
            <h2 className="workspaceTitle">Choose AI transport separately</h2>
            <p className="muted">Professor Vi policy does not silently activate a provider. Use Institution Data & AI Control to choose platform-managed AI, BYOK, local-browser AI, or Off.</p>
            <div className="workspaceList">
              <div className="workspaceRow"><div><strong>Platform-managed</strong><div className="muted">ViTech server AI runtime, only after school approval and platform rollout enablement.</div></div></div>
              <div className="workspaceRow"><div><strong>BYOK</strong><div className="muted">Separate tenant-secret boundary. It remains fail-closed until the institution credential runtime is connected.</div></div></div>
              <div className="workspaceRow"><div><strong>Teacher review</strong><div className="muted">If enabled above, generated packs remain pending until a teacher releases them.</div></div></div>
            </div>
            <Link className="button" href="/workspace/partner/data-control">Open Data & AI Control</Link>
          </article>
        </section>
      </div>
    </main>
  );
}

function Gate({ copy }: { copy: string }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Professor Vi · School Control</strong><Link className="pill" href="/workspace/partner">Partner Workspace</Link></header><div className="workspaceContent"><section className="panel gatePanel"><h2>Professor Vi</h2><p className="muted">{copy}</p></section></div></main>;
}
