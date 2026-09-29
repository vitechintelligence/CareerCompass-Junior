-- Phase 11 closeout: operational hardening, quotas, integration execution and lifecycle requests.
-- Verify on isolated branch first. Do not apply to production without explicit approval.

alter table steam_mission_runs
  add column if not exists reflection text,
  add column if not exists explanation text;

alter table steam_attempts
  add column if not exists submission_id uuid;

create unique index if not exists idx_steam_attempts_submission_id
  on steam_attempts(submission_id)
  where submission_id is not null;

create unique index if not exists idx_steam_runs_active_context
  on steam_mission_runs(learner_id, organization_id, mission_id, mission_version_id, run_mode)
  where status='in_progress';

alter table teacher_learning_progress
  add column if not exists evidence_status text not null default 'not_submitted',
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='teacher_learning_progress_evidence_status_check'
  ) then
    alter table teacher_learning_progress
      add constraint teacher_learning_progress_evidence_status_check
      check (evidence_status in ('not_submitted','submitted','verified','changes_requested'));
  end if;
end
$$;

create index if not exists idx_teacher_learning_evidence_review
  on teacher_learning_progress(evidence_status, updated_at desc);

create table if not exists assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  submission_id uuid not null unique,
  status text not null default 'started' check (status in ('started','submitted','expired','cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_assessment_sessions_active
  on assessment_sessions(assessment_id, student_id)
  where status='started';

create index if not exists idx_assessment_sessions_student
  on assessment_sessions(student_id, status, expires_at desc);

create table if not exists learning_write_quota_windows (
  scope_key text not null,
  window_kind text not null check (window_kind in ('minute','day')),
  window_start timestamptz not null,
  write_count integer not null default 0 check (write_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope_key, window_kind, window_start)
);

alter table integration_sync_jobs
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists worker_key text,
  add column if not exists result_detail jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='integration_sync_jobs_attempt_count_check'
  ) then
    alter table integration_sync_jobs
      add constraint integration_sync_jobs_attempt_count_check
      check (attempt_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='integration_sync_jobs_max_attempts_check'
  ) then
    alter table integration_sync_jobs
      add constraint integration_sync_jobs_max_attempts_check
      check (max_attempts >= 1 and max_attempts <= 10);
  end if;
end
$$;

create index if not exists idx_sync_jobs_runnable
  on integration_sync_jobs(status, next_attempt_at, scheduled_at);

create table if not exists integration_job_events (
  id uuid primary key default gen_random_uuid(),
  sync_job_id uuid not null references integration_sync_jobs(id) on delete cascade,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_integration_job_events_job
  on integration_job_events(sync_job_id, created_at);

create table if not exists integration_reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  sync_job_id uuid not null references integration_sync_jobs(id) on delete cascade,
  external_type text not null,
  external_id text not null,
  canonical_type text,
  canonical_id text,
  status text not null check (status in ('matched','created','updated','skipped','failed')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_integration_reconciliation_job
  on integration_reconciliation_items(sync_job_id, status, created_at);

create table if not exists guardian_report_links (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  guardian_profile_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','revoked')),
  linked_by uuid references profiles(id) on delete set null,
  linked_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (learner_id, organization_id, guardian_profile_id)
);

create index if not exists idx_guardian_report_links_guardian
  on guardian_report_links(guardian_profile_id, status, linked_at desc);

create table if not exists data_lifecycle_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  learner_id uuid references profiles(id) on delete set null,
  requested_by uuid references profiles(id) on delete set null,
  request_type text not null check (request_type in ('export','retention_review','deletion_review')),
  status text not null default 'requested' check (status in ('requested','in_review','completed','rejected','cancelled')),
  scope jsonb not null default '{}'::jsonb,
  resolution jsonb,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_data_lifecycle_requests_org
  on data_lifecycle_requests(organization_id, status, requested_at desc);
