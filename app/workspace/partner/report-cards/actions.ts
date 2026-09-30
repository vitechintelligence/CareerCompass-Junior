"use server";

import { revalidatePath } from "next/cache";
import { requirePartnerOrganizationAccess } from "@/lib/auth/authorization";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";
import { getDb } from "@/lib/db";

async function requireReportCardFeature(organizationId: string) {
  if (!isRiskyFeatureEnabled("reportCardBuilder")) throw new Error("report_card_builder_rollout_disabled");
  const actor = await requirePartnerOrganizationAccess(organizationId);
  const sql = getDb();
  const rows = await sql`
    select enabled
    from organization_features
    where organization_id=${organizationId}
      and feature_key='school_report_card_builder'
    limit 1
  `;
  if (!rows[0]?.enabled) throw new Error("report_card_builder_feature_not_allocated");
  return { actor, sql };
}

function splitList(value: FormDataEntryValue | null, limit: number) {
  return String(value || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, limit);
}

export async function saveSchoolGradingPolicy(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const { actor, sql } = await requireReportCardFeature(organizationId);

  const name = String(formData.get("name") || "School grading policy").trim().slice(0, 160);
  const countryCode = String(formData.get("countryCode") || "VN").trim().toUpperCase().slice(0, 8);
  const educationLevel = String(formData.get("educationLevel") || "custom").trim().slice(0, 80);
  const gradingScale = String(formData.get("gradingScale") || "").trim().slice(0, 4000);
  const calculationRules = String(formData.get("calculationRules") || "").trim().slice(0, 6000);
  const academicPeriods = splitList(formData.get("academicPeriods"), 12);

  const current = await sql`
    select coalesce(max(version_number), 0)::int as version
    from school_grading_policies
    where organization_id=${organizationId}
      and name=${name}
  `;
  const version = Number(current[0]?.version || 0) + 1;

  await sql`
    insert into school_grading_policies (
      organization_id, name, country_code, education_level, policy_source,
      version_number, grading_scale, calculation_rules, academic_periods,
      status, created_by
    )
    values (
      ${organizationId}, ${name}, ${countryCode}, ${educationLevel}, 'school',
      ${version},
      ${JSON.stringify({ description: gradingScale })}::jsonb,
      ${JSON.stringify({ description: calculationRules })}::jsonb,
      ${JSON.stringify(academicPeriods)}::jsonb,
      'draft', ${actor.id}
    )
  `;

  revalidatePath("/workspace/partner/report-cards");
}

export async function activateSchoolGradingPolicy(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const policyId = String(formData.get("policyId") || "");
  const { actor, sql } = await requireReportCardFeature(organizationId);

  const rows = await sql`
    select id
    from school_grading_policies
    where id=${policyId}
      and organization_id=${organizationId}
      and status='draft'
    limit 1
  `;
  if (!rows[0]) throw new Error("grading_policy_not_available");

  await sql.transaction((txn) => [
    txn`update school_grading_policies set status='archived' where organization_id=${organizationId} and status='active'`,
    txn`
      update school_grading_policies
      set status='active', approved_by=${actor.id}, approved_at=now(), updated_at=now()
      where id=${policyId} and organization_id=${organizationId}
    `,
  ]);

  revalidatePath("/workspace/partner/report-cards");
}

export async function activateReportCardTemplate(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const templateId = String(formData.get("templateId") || "");
  const { actor, sql } = await requireReportCardFeature(organizationId);

  const rows = await sql`
    select id
    from report_card_templates
    where id=${templateId}
      and organization_id=${organizationId}
      and status='draft'
    limit 1
  `;
  if (!rows[0]) throw new Error("report_card_template_not_available");

  await sql.transaction((txn) => [
    txn`update report_card_templates set status='archived' where organization_id=${organizationId} and status='active'`,
    txn`
      update report_card_templates
      set status='active', approved_by=${actor.id}, approved_at=now(), updated_at=now()
      where id=${templateId} and organization_id=${organizationId}
    `,
  ]);

  revalidatePath("/workspace/partner/report-cards");
}
