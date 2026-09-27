-- Phase 8: assessment rubric provenance and verified evidence.
-- Prepared for isolated verification first. Do not apply to production without approval.

alter table assessments
  add column if not exists content_version integer not null default 1,
  add column if not exists demonstrated_threshold numeric(5,2) not null default 70;

alter table assessments
  add constraint assessments_content_version_positive
  check (content_version >= 1);

alter table assessments
  add constraint assessments_demonstrated_threshold_check
  check (demonstrated_threshold >= 0 and demonstrated_threshold <= 100);

alter table assessment_questions
  add column if not exists learning_objective_en text,
  add column if not exists learning_objective_vi text,
  add column if not exists rubric jsonb not null default '{}'::jsonb;

alter table assessment_attempts
  add column if not exists assessment_content_version integer not null default 1,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists review_feedback text,
  add column if not exists rubric_result jsonb not null default '{}'::jsonb,
  add column if not exists evidence_level text not null default 'practiced',
  add column if not exists submission_id uuid,
  add column if not exists submission_hash text;

alter table assessment_attempts
  add constraint assessment_attempts_content_version_positive
  check (assessment_content_version >= 1);

alter table assessment_attempts
  add constraint assessment_attempts_evidence_level_check
  check (evidence_level in ('practiced','demonstrated','verified'));

create unique index if not exists idx_assessment_attempts_submission_id
  on assessment_attempts(submission_id)
  where submission_id is not null;

alter table learning_capsules
  drop constraint if exists learning_capsules_source_type_check;

alter table learning_capsules
  add constraint learning_capsules_source_type_check
  check (source_type in (
    'activity_attempt','submission','assessment_attempt',
    'teacher_observation','project','milestone'
  ));
