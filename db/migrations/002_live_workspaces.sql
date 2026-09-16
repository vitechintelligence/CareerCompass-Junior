-- Live Neon persistence and controlled partner onboarding.

create unique index if not exists idx_enrollments_unclassed_unique
  on student_enrollments(student_id, book_id)
  where class_id is null;

create table if not exists partner_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references profiles(id) on delete cascade,
  organization_name text not null,
  organization_type text not null check (organization_type in ('school','training_center')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_profile_id)
);

create index if not exists idx_partner_onboarding_status
  on partner_onboarding_requests(status, created_at desc);
