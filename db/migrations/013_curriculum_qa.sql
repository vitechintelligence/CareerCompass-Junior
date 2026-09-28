-- Phase 9: curriculum QA workflow.
-- Prepared for isolated verification first. Do not apply to production without approval.

alter table activities
  add column if not exists qa_status text not null default 'unreviewed',
  add column if not exists qa_notes text,
  add column if not exists qa_reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists qa_reviewed_at timestamptz;

alter table activities
  add constraint activities_qa_status_check
  check (qa_status in ('unreviewed','in_review','approved','needs_changes'));

create index if not exists idx_activities_qa_status
  on activities(qa_status, status, updated_at desc);
