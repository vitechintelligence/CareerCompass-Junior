-- Phase 4: versioned activity contract and explicit learner/class context.
-- Prepared for isolated verification first. Do not apply to production without approval.

alter table activities
  add column if not exists content_version integer not null default 1;

alter table activities
  add constraint activities_content_version_positive
  check (content_version >= 1);

alter table activity_attempts
  add column if not exists activity_content_version integer not null default 1,
  add column if not exists contract_version integer not null default 1,
  add column if not exists activity_contract jsonb not null default '{}'::jsonb,
  add column if not exists contract_hash text;

alter table activity_attempts
  add constraint activity_attempts_content_version_positive
  check (activity_content_version >= 1);

alter table activity_attempts
  add constraint activity_attempts_contract_version_positive
  check (contract_version >= 1);

create index if not exists idx_attempts_activity_version
  on activity_attempts(activity_id, activity_content_version, submitted_at desc);

alter table assignments
  add column if not exists activity_content_version integer,
  add column if not exists activity_contract jsonb;

alter table assignments
  add constraint assignments_activity_content_version_positive
  check (activity_content_version is null or activity_content_version >= 1);

alter table classes
  add column if not exists grade_level text,
  add column if not exists learner_age_band text,
  add column if not exists english_level text;

alter table classes
  add constraint classes_grade_level_check
  check (grade_level is null or grade_level ~ '^(?:[1-9]|1[0-2])$');

alter table classes
  add constraint classes_learner_age_band_check
  check (
    learner_age_band is null or (
      learner_age_band ~ '^([3-9]|1[0-9]|2[01])-([3-9]|1[0-9]|2[01])

      and split_part(learner_age_band, '-', 1)::int <= split_part(learner_age_band, '-', 2)::int
    )
  );
