-- Phase 6: duplicate-safe learner attempts and synchronization.
-- Prepared for isolated verification first. Do not apply to production without approval.

alter table activity_attempts
  add column if not exists submission_id uuid,
  add column if not exists submission_hash text;

create unique index if not exists idx_activity_attempts_submission_id
  on activity_attempts(submission_id)
  where submission_id is not null;

create table if not exists learning_attempt_counters (
  activity_id uuid not null references activities(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  next_attempt integer not null check (next_attempt >= 1),
  updated_at timestamptz not null default now(),
  primary key (activity_id, student_id)
);

insert into learning_attempt_counters (activity_id, student_id, next_attempt)
select activity_id, student_id, max(attempt_number)::int
from activity_attempts
group by activity_id, student_id
on conflict (activity_id, student_id) do update set
  next_attempt=greatest(learning_attempt_counters.next_attempt, excluded.next_attempt),
  updated_at=now();
