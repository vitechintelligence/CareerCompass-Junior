-- Phase 7: assignment submission revision workflow.
-- Prepared for isolated verification first. Do not apply to production without approval.

alter table submissions
  add column if not exists current_revision integer not null default 0;

alter table submissions
  add constraint submissions_current_revision_nonnegative
  check (current_revision >= 0);

create table if not exists submission_revisions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  revision_number integer not null check (revision_number >= 1),
  submission_key uuid not null unique,
  response jsonb not null default '{}'::jsonb,
  artifact_url text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (submission_id, revision_number)
);

create index if not exists idx_submission_revisions_submission
  on submission_revisions(submission_id, revision_number desc);

alter table teacher_feedback
  add column if not exists submission_revision_id uuid references submission_revisions(id) on delete set null;

create unique index if not exists idx_teacher_feedback_revision_teacher
  on teacher_feedback(submission_revision_id, teacher_id)
  where submission_revision_id is not null and teacher_id is not null;
