"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { buildInstitutionPlan } from "@/lib/langgraph/institution-builder";
import { PLATFORM_FEATURES, sanitizeFeatureKeys } from "@/lib/platform-feature-catalog";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textValue(value: FormDataEntryValue | null, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function assertUuid(value: string, label: string) {
  if (!UUID_RE.test(value)) throw new Error(`Invalid ${label}.`);
}

export async function approvePartnerRequest(formData: FormData) {
  const { profile: admin } = await requirePlatformAdmin();
  const requestId = textValue(formData.get("requestId"), 60);
  const reviewNote = textValue(formData.get("reviewNote"), 500);
  assertUuid(requestId, "partner request");

  const sql = getDb();
  const rows = await sql`
    select id, requester_profile_id, organization_name, organization_type, status
    from partner_onboarding_requests
    where id = ${requestId}
    limit 1
  `;
  const request = rows[0];
  if (!request) throw new Error("Partner request not found.");

  const requesterProfileId = String(request.requester_profile_id);
  let organizationId = "";

  const existing = await sql`
    select om.organization_id
    from organization_memberships om
    where om.profile_id = ${requesterProfileId}
      and om.role = 'partner_admin'
      and om.status = 'active'
    limit 1
  `;

  if (existing[0]?.organization_id) {
    organizationId = String(existing[0].organization_id);
  } else {
    const semanticId = `vn-org-${randomUUID().slice(0, 8)}`;
    const created = await sql`
      insert into organizations (semantic_id, name, organization_type, status, locale)
      values (${semanticId}, ${String(request.organization_name)}, ${String(request.organization_type)}, 'active', 'vi')
      returning id
    `;
    organizationId = String(created[0]?.id || "");
    if (!organizationId) throw new Error("Could not create partner organization.");
  }

  await sql`
    update profiles
    set account_type = 'partner_admin', updated_at = now()
    where id = ${requesterProfileId}
  `;

  await sql`
    insert into organization_memberships (organization_id, profile_id, role, status)
    values (${organizationId}, ${requesterProfileId}, 'partner_admin', 'active')
    on conflict (organization_id, profile_id, role) do update set status = 'active'
  `;

  await sql`
    update partner_onboarding_requests
    set status = 'approved', reviewed_by = ${admin.id}, reviewed_at = now(), review_note = ${reviewNote || null}, updated_at = now()
    where id = ${requestId}
  `;

  await sql`
    insert into admin_audit_events (actor_profile_id, organization_id, event_type, target_type, target_id, detail)
    values (${admin.id}, ${organizationId}, 'partner_approved', 'partner_onboarding_request', ${requestId}, ${JSON.stringify({ reviewNote })}::jsonb)
  `;

  revalidatePath("/workspace/admin");
  revalidatePath("/workspace/partner");
}

export async function rejectPartnerRequest(formData: FormData) {
  const { profile: admin } = await requirePlatformAdmin();
  const requestId = textValue(formData.get("requestId"), 60);
  const reviewNote = textValue(formData.get("reviewNote"), 500);
  assertUuid(requestId, "partner request");

  const sql = getDb();
  const rows = await sql`
    update partner_onboarding_requests
    set status = 'rejected', reviewed_by = ${admin.id}, reviewed_at = now(), review_note = ${reviewNote || null}, updated_at = now()
    where id = ${requestId}
    returning requester_profile_id
  `;
  if (!rows[0]) throw new Error("Partner request not found.");

  await sql`
    insert into admin_audit_events (actor_profile_id, event_type, target_type, target_id, detail)
    values (${admin.id}, 'partner_rejected', 'partner_onboarding_request', ${requestId}, ${JSON.stringify({ reviewNote })}::jsonb)
  `;

  revalidatePath("/workspace/admin");
}

export async function runInstitutionBuild(formData: FormData) {
  const { profile: admin } = await requirePlatformAdmin();
  const organizationId = textValue(formData.get("organizationId"), 60);
  assertUuid(organizationId, "organization");
  const selectedFeatures = sanitizeFeatureKeys(formData.getAll("features").map((value) => String(value)));

  const sql = getDb();
  const rows = await sql`
    select id, semantic_id, name, organization_type, locale
    from organizations
    where id = ${organizationId} and status = 'active'
    limit 1
  `;
  const organization = rows[0];
  if (!organization) throw new Error("Active organization not found.");

  const runRows = await sql`
    insert into workflow_runs (organization_id, workflow_key, status, input, triggered_by)
    values (${organizationId}, 'institution_white_label_builder', 'running', ${JSON.stringify({ selectedFeatures })}::jsonb, ${admin.id})
    returning id
  `;
  const runId = String(runRows[0]?.id || "");
  if (!runId) throw new Error("Could not start LangGraph workflow.");

  try {
    const result = await buildInstitutionPlan({
      organizationId,
      organizationName: String(organization.name),
      organizationType: String(organization.organization_type),
      organizationSemanticId: String(organization.semantic_id),
      locale: String(organization.locale) === "en" ? "en" : "vi",
      requestedFeatures: selectedFeatures,
    });

    const enabled = new Set(Array.isArray(result.featurePlan) ? result.featurePlan.map(String) : []);
    for (const feature of PLATFORM_FEATURES) {
      await sql`
        insert into organization_features (organization_id, feature_key, enabled, source, allocated_by, updated_at)
        values (${organizationId}, ${feature.key}, ${enabled.has(feature.key)}, 'langgraph', ${admin.id}, now())
        on conflict (organization_id, feature_key) do update set
          enabled = excluded.enabled,
          source = 'langgraph',
          allocated_by = excluded.allocated_by,
          updated_at = now()
      `;
    }

    const modules = (result.modules || {}) as Record<string, unknown>;
    const intelligenceProfile = (result.intelligenceProfile || {}) as Record<string, unknown>;
    const complianceProfile = (result.complianceProfile || {}) as Record<string, unknown>;

    await sql`
      insert into institution_sites (
        organization_id, slug, display_name, locale, headline, summary, status,
        modules, intelligence_profile, compliance_profile, generated_by, last_graph_run_id, generated_at, updated_at
      )
      values (
        ${organizationId}, ${String(result.slug)}, ${String(result.pageTitle)}, ${String(organization.locale) === 'en' ? 'en' : 'vi'},
        ${String(result.pageHeadline)}, ${String(result.pageSummary)}, 'draft',
        ${JSON.stringify(modules)}::jsonb, ${JSON.stringify(intelligenceProfile)}::jsonb, ${JSON.stringify(complianceProfile)}::jsonb,
        ${admin.id}, ${runId}, now(), now()
      )
      on conflict (organization_id) do update set
        slug = excluded.slug,
        display_name = excluded.display_name,
        locale = excluded.locale,
        headline = excluded.headline,
        summary = excluded.summary,
        modules = excluded.modules,
        intelligence_profile = excluded.intelligence_profile,
        compliance_profile = excluded.compliance_profile,
        generated_by = excluded.generated_by,
        last_graph_run_id = excluded.last_graph_run_id,
        generated_at = now(),
        updated_at = now()
    `;

    const output = {
      slug: String(result.slug),
      enabledFeatures: Array.from(enabled),
      complianceProfile,
      intelligenceProfile,
    };

    await sql`
      update workflow_runs
      set status = 'completed', output = ${JSON.stringify(output)}::jsonb, completed_at = now()
      where id = ${runId}
    `;

    await sql`
      insert into admin_audit_events (actor_profile_id, organization_id, event_type, target_type, target_id, detail)
      values (${admin.id}, ${organizationId}, 'langgraph_institution_build', 'workflow_run', ${runId}, ${JSON.stringify(output)}::jsonb)
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Institution build failed.";
    await sql`
      update workflow_runs
      set status = 'failed', error_message = ${message}, completed_at = now()
      where id = ${runId}
    `;
    throw error;
  }

  revalidatePath("/workspace/admin");
  revalidatePath("/workspace/partner");
}

export async function setInstitutionSiteStatus(formData: FormData) {
  const { profile: admin } = await requirePlatformAdmin();
  const organizationId = textValue(formData.get("organizationId"), 60);
  const status = textValue(formData.get("status"), 20);
  assertUuid(organizationId, "organization");
  if (!["draft", "published", "paused"].includes(status)) throw new Error("Invalid institution site status.");

  const sql = getDb();
  const rows = await sql`
    update institution_sites
    set status = ${status}, updated_at = now()
    where organization_id = ${organizationId}
    returning slug
  `;
  if (!rows[0]) throw new Error("Generate the institution page before changing its status.");

  await sql`
    insert into admin_audit_events (actor_profile_id, organization_id, event_type, target_type, target_id, detail)
    values (${admin.id}, ${organizationId}, 'institution_site_status', 'institution_site', ${String(rows[0].slug)}, ${JSON.stringify({ status })}::jsonb)
  `;

  revalidatePath("/workspace/admin");
  revalidatePath(`/institution/${String(rows[0].slug)}`);
}
