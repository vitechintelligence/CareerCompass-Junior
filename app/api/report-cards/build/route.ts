import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requirePartnerOrganizationAccess } from "@/lib/auth/authorization";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";
import { getDb } from "@/lib/db";
import { runReportCardBuilder } from "@/lib/report-cards/ai-builder";
import type { ReportCardBuilderAnswers } from "@/lib/report-cards/builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function list(form: FormData, key: string) {
  return form.getAll(key).map((value) => String(value).trim()).filter(Boolean);
}

function yes(value: FormDataEntryValue | null) {
  return String(value || "") === "true" || String(value || "") === "on";
}

function errorJson(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    if (!isRiskyFeatureEnabled("reportCardBuilder")) return errorJson("report_card_builder_rollout_disabled", 403);
    const form = await request.formData();
    const organizationId = String(form.get("organizationId") || "");
    const actor = await requirePartnerOrganizationAccess(organizationId);
    const sql = getDb();

    const feature = await sql`
      select enabled
      from organization_features
      where organization_id=${organizationId}
        and feature_key='school_report_card_builder'
      limit 1
    `;
    if (!feature[0]?.enabled) return errorJson("report_card_builder_feature_not_allocated", 403);

    const startMode = String(form.get("startMode") || "country_template") as ReportCardBuilderAnswers["startMode"];
    if (!["country_template","vitech_template","blank","remix","school_import","ai_builder"].includes(startMode)) {
      return errorJson("invalid_report_card_start_mode", 400);
    }

    const answers: ReportCardBuilderAnswers = {
      countryCode: String(form.get("countryCode") || "VN").trim().toUpperCase().slice(0, 8),
      educationLevel: String(form.get("educationLevel") || "custom").trim().slice(0, 80),
      startMode,
      schoolName: String(form.get("schoolName") || "").trim().slice(0, 200),
      title: String(form.get("title") || "").trim().slice(0, 200),
      languages: list(form, "languages").slice(0, 5),
      academicPeriods: list(form, "academicPeriods").slice(0, 12),
      gradingScale: String(form.get("gradingScale") || "").trim().slice(0, 1000),
      subjects: list(form, "subjects").slice(0, 80),
      includeConduct: yes(form.get("includeConduct")),
      includeCompetencies: yes(form.get("includeCompetencies")),
      requiredSignatures: list(form, "requiredSignatures").slice(0, 12),
      printNotes: String(form.get("printNotes") || "").trim().slice(0, 1000),
      additionalRequirements: String(form.get("additionalRequirements") || "").trim().slice(0, 2000),
    };

    const upload = form.get("schoolTemplate");
    const uploadedTemplate = upload instanceof File && upload.size > 0 ? upload : null;
    if (uploadedTemplate && uploadedTemplate.size > 10 * 1024 * 1024) {
      return errorJson("report_card_import_too_large", 413);
    }

    const result = await runReportCardBuilder({ answers, uploadedTemplate });
    const templateId = randomUUID();
    const sessionId = randomUUID();
    const code = "report-" + answers.countryCode.toLowerCase() + "-" + answers.educationLevel.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "-" + templateId.slice(0, 8);
    const sourceType =
      startMode === "school_import" ? "school_import" :
      startMode === "ai_builder" ? "ai_builder" :
      startMode === "country_template" ? "country_template" :
      startMode === "vitech_template" ? "vitech_template" : "blank";

    await sql.transaction((txn) => [
      txn`
        insert into report_card_builder_sessions (
          id, organization_id, created_by, mode, country_code, education_level,
          answers, generated_template_id, status
        )
        values (
          ${sessionId}, ${organizationId}, ${actor.profile.id},
          ${startMode === "school_import" ? "import" : startMode === "remix" ? "remix" : startMode === "blank" ? "blank" : "guided"},
          ${answers.countryCode}, ${answers.educationLevel},
          ${JSON.stringify({ ...answers, generationMode: result.generationMode, model: result.model })}::jsonb,
          ${templateId}, 'generated'
        )
      `,
      txn`
        insert into report_card_templates (
          id, organization_id, code, name, country_code, education_level, source_type,
          version_number, schema_version, layout_schema, field_mapping, print_profile,
          status, created_by
        )
        values (
          ${templateId}, ${organizationId}, ${code}, ${result.schema.title},
          ${answers.countryCode}, ${answers.educationLevel}, ${sourceType},
          1, 1, ${JSON.stringify(result.schema)}::jsonb, '{}'::jsonb,
          ${JSON.stringify({ pageSize: result.schema.pageSize, orientation: result.schema.orientation })}::jsonb,
          'draft', ${actor.profile.id}
        )
      `,
    ]);

    return NextResponse.json(
      { ok: true, templateId, sessionId, generationMode: result.generationMode, schema: result.schema },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "report_card_builder_failed";
    const denied = code.includes("access") || code.includes("disabled") || code.includes("not_allocated");
    return errorJson(denied ? code : "report_card_builder_failed", denied ? 403 : 503);
  }
}
