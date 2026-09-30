"use server";

import { revalidatePath } from "next/cache";
import { requirePartnerOrganizationAccess } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";

const MODES = new Set(["summary","study_guide","quiz","socratic","math_science"]);
const TYPES = new Set(["pdf","ppt","pptx","txt","md","doc","docx","pasted_text"]);

function text(form: FormData, key: string, max = 200) {
  return String(form.get(key) || "").trim().slice(0, max);
}

export async function saveProfessorViPolicy(formData: FormData) {
  if (!isRiskyFeatureEnabled("professorViAiStudy")) throw new Error("professor_vi_rollout_disabled");
  const organizationId = text(formData, "organizationId", 60);
  const { profile } = await requirePartnerOrganizationAccess(organizationId);
  const sql = getDb();

  const allocated = await sql`
    select enabled
    from organization_features
    where organization_id=${organizationId}
      and feature_key='professor_vi_ai_study_lab'
    limit 1
  `;
  if (!allocated[0]?.enabled) throw new Error("professor_vi_feature_not_allocated");

  const allowedModes = formData.getAll("allowedModes").map(String).filter((value) => MODES.has(value));
  const sourceTypes = formData.getAll("sourceTypes").map(String).filter((value) => TYPES.has(value));
  const strictness = text(formData, "answerReleaseStrictness", 40);
  const intervention = text(formData, "interventionIntensity", 40);
  const maxMb = Math.max(1, Math.min(50, Number(text(formData, "maxSourceMb", 4) || 10)));
  const retentionDays = Math.max(1, Math.min(365, Number(text(formData, "retentionDays", 4) || 30)));
  if (!["guided","balanced","direct_when_stuck"].includes(strictness)) throw new Error("invalid_answer_release_policy");
  if (!["light","adaptive","high_support"].includes(intervention)) throw new Error("invalid_intervention_policy");

  await sql`
    insert into professor_vi_policies (
      organization_id, enabled, allowed_modes, answer_release_strictness,
      require_teacher_review_generated_packs, allow_source_uploads, allowed_source_types,
      max_source_bytes, retention_days, primary_language, cefr_target,
      intervention_intensity, configured_by, updated_at
    )
    values (
      ${organizationId}, ${formData.get("enabled") === "on"}, ${allowedModes},
      ${strictness}, ${formData.get("teacherReview") === "on"},
      ${formData.get("allowSourceUploads") === "on"}, ${sourceTypes},
      ${Math.trunc(maxMb * 1024 * 1024)}, ${retentionDays},
      ${text(formData, "primaryLanguage", 20) || "vi"},
      ${text(formData, "cefrTarget", 20) || null}, ${intervention}, ${profile.id}, now()
    )
    on conflict (organization_id) do update set
      enabled=excluded.enabled,
      allowed_modes=excluded.allowed_modes,
      answer_release_strictness=excluded.answer_release_strictness,
      require_teacher_review_generated_packs=excluded.require_teacher_review_generated_packs,
      allow_source_uploads=excluded.allow_source_uploads,
      allowed_source_types=excluded.allowed_source_types,
      max_source_bytes=excluded.max_source_bytes,
      retention_days=excluded.retention_days,
      primary_language=excluded.primary_language,
      cefr_target=excluded.cefr_target,
      intervention_intensity=excluded.intervention_intensity,
      configured_by=excluded.configured_by,
      updated_at=now()
  `;

  await sql`
    insert into admin_audit_events (
      actor_profile_id, organization_id, event_type, target_type, target_id, detail
    )
    values (
      ${profile.id}, ${organizationId}, 'professor_vi_policy_updated',
      'professor_vi_policy', ${organizationId},
      ${JSON.stringify({
        enabled: formData.get("enabled") === "on",
        allowedModes,
        strictness,
        teacherReview: formData.get("teacherReview") === "on",
        retentionDays,
      })}::jsonb
    )
  `;

  revalidatePath("/workspace/partner/ai-learning");
  revalidatePath("/workspace/student/ai-study");
  revalidatePath("/workspace/teacher/ai-learning");
}
