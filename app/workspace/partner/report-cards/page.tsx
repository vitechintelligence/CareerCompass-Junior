import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";
import ReportCardBuilderClient from "./ReportCardBuilderClient";
import { activateReportCardTemplate, activateSchoolGradingPolicy, saveSchoolGradingPolicy } from "./actions";

export const dynamic = "force-dynamic";

export default async function PartnerReportCardStudioPage() {
  const user = await getSessionUser();
  const profile = user ? await getCurrentProfile() : null;
  if (!profile || profile.status !== "active" || !["partner_admin","platform_admin"].includes(profile.account_type)) {
    return <Gate copy="School administrator access is required." />;
  }
  if (!isRiskyFeatureEnabled("reportCardBuilder")) {
    return <Gate copy="Report Card Studio is prepared but remains behind the Phase A rollout switch." />;
  }

  const sql = getDb();
  const schema = await sql`
    select
      to_regclass('public.school_grading_policies') as grading,
      to_regclass('public.report_card_templates') as templates,
      to_regclass('public.report_card_builder_sessions') as sessions
  `;
  if (!schema[0]?.grading || !schema[0]?.templates || !schema[0]?.sessions) {
    return <Gate copy="Migration 015 is prepared but has not been activated in this environment." />;
  }

  const organizations = profile.account_type === "platform_admin"
    ? await sql`
        select o.id, o.name
        from organizations o
        join organization_features f on f.organization_id=o.id
        where o.status='active'
          and f.feature_key='school_report_card_builder'
          and f.enabled=true
        order by o.name
      `
    : await sql`
        select o.id, o.name
        from organization_memberships om
        join organizations o on o.id=om.organization_id and o.status='active'
        join organization_features f
          on f.organization_id=o.id
         and f.feature_key='school_report_card_builder'
         and f.enabled=true
        where om.profile_id=${profile.id}
          and om.role='partner_admin'
          and om.status='active'
        order by o.name
      `;

  const organization = organizations[0];
  if (!organization) return <Gate copy="ViTech platform administration must enable the School grading + report cards feature for this institution first." />;
  const organizationId = String(organization.id);

  const gradingPolicies = await sql`
    select id, name, country_code, education_level, version_number, grading_scale,
      calculation_rules, academic_periods, status, created_at
    from school_grading_policies
    where organization_id=${organizationId}
      and status in ('draft','active')
    order by status='active' desc, created_at desc
    limit 20
  `;
  const templates = await sql`
    select id, code, name, country_code, education_level, source_type,
      version_number, layout_schema, status, created_at
    from report_card_templates
    where organization_id=${organizationId}
      and status in ('draft','active')
    order by status='active' desc, created_at desc
    limit 20
  `;

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>Report Card Studio</strong><div className="muted" style={{ fontSize: 12 }}>School-owned scoring · template builder</div></div>
        <Link className="pill" href="/workspace/partner">Partner Workspace</Link>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">Institution authority</div>
            <h1 className="workspaceHeroTitle">{String(organization.name)}</h1>
            <p className="muted">ViTech provides the tool and starting templates. Your school owns the active grading policy, report-card layout, approval process and any government-mandated implementation.</p>
          </div>
          <span className="pill">School-admin controlled</span>
        </section>

        <section className="statusBanner">
          <strong>Scoring is separate from Professor Vi.</strong>
          <span>Professor Vi may help draft a structure or explain learning evidence, but it does not silently calculate or change official school grades. Only an approved school grading policy and authorized school workflow can drive official reporting.</span>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">A · School grading policy</div>
            <h2 className="workspaceTitle">Define what your school follows</h2>
            <form action={saveSchoolGradingPolicy} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label><span>Policy name</span><input name="name" defaultValue="Official school grading policy" maxLength={160} required /></label>
              <label><span>Country / framework</span><select name="countryCode" defaultValue="VN"><option value="VN">Vietnam</option><option value="PH">Philippines</option><option value="MY">Malaysia</option><option value="SG">Singapore</option><option value="TH">Thailand</option><option value="ID">Indonesia</option><option value="CUSTOM">Other / custom</option></select></label>
              <label><span>Education level</span><select name="educationLevel" defaultValue="lower_secondary"><option value="primary">Primary</option><option value="lower_secondary">Lower secondary</option><option value="upper_secondary">Upper secondary</option><option value="custom">Custom / mixed</option></select></label>
              <label><span>Academic periods</span><input name="academicPeriods" defaultValue="Học kỳ I, Học kỳ II, Cả năm" placeholder="Semester I, Semester II, Full year" /></label>
              <label><span>Official grading scale / descriptors</span><textarea name="gradingScale" rows={5} required placeholder="Enter the scale your school is required to use. Do not rely on AI to choose it." /></label>
              <label><span>Calculation / progression rules</span><textarea name="calculationRules" rows={5} required placeholder="Enter the school or government rules that must be followed." /></label>
              <button className="button primary" type="submit">Save as new draft version</button>
            </form>
          </article>

          <article className="panel">
            <div className="eyebrow">Current grading policies</div>
            <h2 className="workspaceTitle">School-controlled versions</h2>
            <div className="workspaceList">
              {gradingPolicies.length === 0 && <p className="muted">No grading policy has been configured yet.</p>}
              {gradingPolicies.map((policy) => (
                <div className="feedbackCard" key={String(policy.id)}>
                  <div className="workspaceRow" style={{ padding: 0 }}>
                    <div><strong>{String(policy.name)}</strong><div className="muted">{String(policy.country_code)} · {String(policy.education_level)} · v{String(policy.version_number)}</div></div>
                    <span className="pill">{String(policy.status)}</span>
                  </div>
                  {String(policy.status) === "draft" && <form action={activateSchoolGradingPolicy}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="policyId" value={String(policy.id)} /><button className="button primary" type="submit">Approve & activate</button></form>}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="eyebrow">B · Report Card Builder</div>
          <h2 className="workspaceTitle">Start from a mandated form, remix a preset, or describe what you need.</h2>
          <p className="muted">The guided builder behaves like a product builder: answer the school questions, optionally upload your existing report-card form, and generate an editable draft. Nothing becomes official until a school administrator activates it.</p>
          <ReportCardBuilderClient organizationId={organizationId} />
        </section>

        <section className="panel">
          <div className="eyebrow">Drafts & active template</div>
          <h2 className="workspaceTitle">Institution report-card versions</h2>
          <div className="workspaceList">
            {templates.length === 0 && <p className="muted">No report-card template has been generated yet.</p>}
            {templates.map((template) => {
              const schema = template.layout_schema && typeof template.layout_schema === "object"
                ? template.layout_schema as Record<string, unknown>
                : {};
              return (
                <article className="feedbackCard" key={String(template.id)}>
                  <div className="workspaceRow" style={{ padding: 0 }}>
                    <div><strong>{String(template.name)}</strong><div className="muted">{String(template.country_code)} · {String(template.education_level)} · {String(template.source_type).replaceAll("_"," ")}</div></div>
                    <span className="pill">{String(template.status)}</span>
                  </div>
                  <p className="muted">{String(schema.sourceNote || "School-admin draft")}</p>
                  {String(template.status) === "draft" && <form action={activateReportCardTemplate}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="templateId" value={String(template.id)} /><button className="button primary" type="submit">Approve & activate template</button></form>}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function Gate({ copy }: { copy: string }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Report Card Studio</strong><Link className="pill" href="/workspace/partner">Partner Workspace</Link></header><div className="workspaceContent"><section className="panel gatePanel"><h2>School grading + report cards</h2><p className="muted">{copy}</p></section></div></main>;
}
