import "server-only";

import { getDb } from "@/lib/db";
import type { ProfessorViInstitutionPolicy, ProfessorViLessonMode, ProfessorViLearnerState } from "@/lib/professor-vi/protocol";

export async function loadProfessorViInstitutionPolicy(organizationId: string): Promise<ProfessorViInstitutionPolicy & {
  enabled: boolean;
  allowSourceUploads: boolean;
  allowedSourceTypes: string[];
  maxSourceBytes: number;
  retentionDays: number;
}> {
  const sql = getDb();
  const rows = await sql`
    select enabled, allowed_modes, answer_release_strictness,
      require_teacher_review_generated_packs, allow_source_uploads,
      allowed_source_types, max_source_bytes, retention_days,
      primary_language, cefr_target, intervention_intensity
    from professor_vi_policies
    where organization_id=${organizationId}
    limit 1
  `;
  const row = rows[0];
  return {
    enabled: Boolean(row?.enabled),
    allowedModes: Array.isArray(row?.allowed_modes) ? row.allowed_modes.map(String) : [],
    answerReleaseStrictness: (String(row?.answer_release_strictness || "guided") as ProfessorViInstitutionPolicy["answerReleaseStrictness"]),
    teacherReviewRequired: row?.require_teacher_review_generated_packs !== false,
    allowSourceUploads: row?.allow_source_uploads !== false,
    allowedSourceTypes: Array.isArray(row?.allowed_source_types) ? row.allowed_source_types.map(String) : [],
    maxSourceBytes: Math.max(1024, Number(row?.max_source_bytes || 10485760)),
    retentionDays: Math.max(1, Number(row?.retention_days || 30)),
    primaryLanguage: String(row?.primary_language || "vi"),
    cefrTarget: row?.cefr_target ? String(row.cefr_target) : null,
    interventionIntensity: (String(row?.intervention_intensity || "adaptive") as ProfessorViInstitutionPolicy["interventionIntensity"]),
  };
}

export async function loadProfessorViLearnerState(
  learnerId: string,
  organizationId: string,
  lessonMode: ProfessorViLessonMode,
): Promise<ProfessorViLearnerState> {
  const sql = getDb();
  const rows = await sql`
    select
      coalesce(
        (select ldp.age_band
         from learner_delivery_profiles ldp
         where ldp.learner_id=${learnerId}
           and ldp.organization_id=${organizationId}
         limit 1),
        (select c.learner_age_band
         from class_memberships cm
         join classes c on c.id=cm.class_id
         where cm.student_id=${learnerId}
           and cm.status='active'
           and c.organization_id=${organizationId}
           and c.status='active'
           and c.learner_age_band is not null
         order by c.updated_at desc
         limit 1)
      ) as age_band,
      (select c.english_level
       from class_memberships cm
       join classes c on c.id=cm.class_id
       where cm.student_id=${learnerId}
         and cm.status='active'
         and c.organization_id=${organizationId}
         and c.status='active'
         and c.english_level is not null
       order by c.updated_at desc
       limit 1) as english_level
  `;
  const row = rows[0];
  return {
    ageBand: row?.age_band ? String(row.age_band) : null,
    cefr: row?.english_level ? String(row.english_level) : null,
    primaryLanguage: "vi",
    lessonMode,
    promptDependence: 0,
    reasoningDepth: 0.5,
    scaffoldLevel: 0,
    attemptCount: 0,
    repeatedFailure: 0,
    masteryEvidence: "unknown",
    recentSuccess: [],
    recentBarriers: [],
  };
}
