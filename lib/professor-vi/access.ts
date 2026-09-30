import "server-only";

import {
  requireActiveProfile,
  requirePartnerOrganizationAccess,
  requireTeacherOrganizationAccess,
  isUuidReference,
} from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";
import { getOrganizationRuntimePolicy, serverAiPermission } from "@/lib/organization-data-policy";
import { platformAiRuntime } from "@/lib/platform-ai-runtime";

export async function requireProfessorViStudentAccess(organizationId: string) {
  if (!isUuidReference(organizationId)) throw new Error("invalid_organization_reference");
  if (!isRiskyFeatureEnabled("professorViAiStudy")) throw new Error("professor_vi_rollout_disabled");

  const profile = await requireActiveProfile(["student"]);
  const sql = getDb();
  const rows = await sql`
    select o.id
    from organization_memberships om
    join organizations o on o.id=om.organization_id
    join organization_features f on f.organization_id=o.id
    left join professor_vi_policies p on p.organization_id=o.id
    where om.profile_id=${profile.id}
      and om.organization_id=${organizationId}
      and om.role='student'
      and om.status='active'
      and o.status='active'
      and f.feature_key='professor_vi_ai_study_lab'
      and f.enabled=true
      and coalesce(p.enabled, false)=true
      and exists (
        select 1 from learner_consent_records lcr
        where lcr.learner_id=${profile.id}
          and lcr.organization_id=o.id
          and lcr.consent_type='ai_assistive_features'
          and lcr.status='active'
          and lcr.revoked_at is null
      )
    limit 1
  `;
  if (!rows[0]) throw new Error("professor_vi_not_authorized");

  const runtimePolicy = await getOrganizationRuntimePolicy(organizationId);
  const platformRuntime = platformAiRuntime();
  const permission = serverAiPermission(runtimePolicy, {
    institutionFeatureEnabled: true,
    platformMode: platformRuntime.mode,
  });
  if (!permission.allowed) throw new Error(permission.code || "professor_vi_ai_not_available");

  return { profile, organizationId, runtimePolicy, aiPermission: permission };
}

export async function requireProfessorViPartnerAccess(organizationId: string) {
  if (!isRiskyFeatureEnabled("professorViAiStudy")) throw new Error("professor_vi_rollout_disabled");
  const context = await requirePartnerOrganizationAccess(organizationId);
  const sql = getDb();
  const feature = await sql`
    select enabled
    from organization_features
    where organization_id=${organizationId}
      and feature_key='professor_vi_ai_study_lab'
    limit 1
  `;
  if (!feature[0]?.enabled) throw new Error("professor_vi_feature_not_allocated");
  return context;
}

export async function requireProfessorViTeacherAccess(organizationId: string) {
  if (!isRiskyFeatureEnabled("professorViAiStudy")) throw new Error("professor_vi_rollout_disabled");
  const context = await requireTeacherOrganizationAccess(organizationId);
  const sql = getDb();
  const feature = await sql`
    select enabled
    from organization_features
    where organization_id=${organizationId}
      and feature_key='professor_vi_ai_study_lab'
    limit 1
  `;
  if (!feature[0]?.enabled) throw new Error("professor_vi_feature_not_allocated");
  return context;
}
