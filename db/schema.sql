-- Career Compass Junior Mastery
-- Neon/PostgreSQL schema
-- Privacy principle: keep operational identity minimal. Do not store health data,
-- government IDs, home addresses, parent financial details, recordings, or other
-- sensitive learner evidence in these tables. Sensitive/local evidence belongs in
-- learner-controlled storage; learning_capsules stores only necessary metadata/proofs.

create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  semantic_id text not null unique,
  name text not null,
  organization_type text not null check (organization_type in ('school','training_center','enterprise','internal')),
  status text not null default 'active' check (status in ('active','paused','archived')),
  locale text not null default 'vi' check (locale in ('vi','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  semantic_id text not null unique,
  auth_subject text unique,
  display_name text,
  preferred_locale text not null default 'vi' check (preferred_locale in ('vi','en')),
  account_type text not null check (account_type in ('student','teacher','partner_admin','platform_admin')),
  status text not null default 'active' check (status in ('invited','active','suspended','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_credentials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  login_alias text not null,
  credential_hash text,
  must_rotate boolean not null default true,
  last_rotated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, login_alias),
  unique (student_id, organization_id)
);

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('student','teacher','partner_admin')),
  status text not null default 'active' check (status in ('invited','active','inactive')),
  joined_at timestamptz not null default now(),
  unique (organization_id, profile_id, role)
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  semantic_id text not null unique,
  name text not null,
  level_label text,
  academic_cycle text,
  status text not null default 'active' check (status in ('draft','active','completed','archived')),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists class_memberships (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','withdrawn')),
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists teacher_assignments (
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  assignment_role text not null default 'teacher' check (assignment_role in ('teacher','lead_teacher','assistant')),
  assigned_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title_en text not null,
  title_vi text not null,
  description_en text,
  description_vi text,
  level_label text,
  age_band text,
  version text not null default '1.0',
  cover_asset_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists book_units (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  unit_number integer not null,
  code text not null,
  title_en text not null,
  title_vi text not null,
  objective_en text,
  objective_vi text,
  career_compass_focus text,
  mastery_english_focus text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  unique (book_id, unit_number),
  unique (book_id, code)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references book_units(id) on delete cascade,
  code text not null,
  activity_type text not null check (activity_type in (
    'look_listen_say','speaking_model','listening','matching','sorting','multiple_choice',
    'writing','reflection','project','self_check','teacher_check','resource'
  )),
  title_en text not null,
  title_vi text not null,
  instructions_en text,
  instructions_vi text,
  content jsonb not null default '{}'::jsonb,
  max_score numeric(8,2),
  evidence_eligible boolean not null default false,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, code)
);

create table if not exists student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  status text not null default 'active' check (status in ('active','completed','paused','withdrawn')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, book_id, class_id)
);

create table if not exists book_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references student_enrollments(id) on delete cascade,
  unit_id uuid not null references book_units(id) on delete cascade,
  completion_percent numeric(5,2) not null default 0 check (completion_percent between 0 and 100),
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  last_activity_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (enrollment_id, unit_id)
);

create table if not exists activity_attempts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  enrollment_id uuid references student_enrollments(id) on delete set null,
  attempt_number integer not null default 1,
  response jsonb not null default '{}'::jsonb,
  score numeric(8,2),
  completion_status text not null default 'submitted' check (completion_status in ('started','submitted','reviewed','completed')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  unique (activity_id, student_id, attempt_number)
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  session_date date not null,
  status text not null check (status in ('present','late','absent','excused')),
  recorded_by uuid references profiles(id) on delete set null,
  note text,
  recorded_at timestamptz not null default now(),
  unique (class_id, student_id, session_date)
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  activity_id uuid references activities(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  title_en text not null,
  title_vi text not null,
  instructions_en text,
  instructions_vi text,
  due_at timestamptz,
  status text not null default 'published' check (status in ('draft','published','closed','archived')),
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  response jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('draft','submitted','returned','accepted')),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table if not exists teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete set null,
  feedback_text text,
  rubric jsonb not null default '{}'::jsonb,
  score numeric(8,2),
  visibility text not null default 'student' check (visibility in ('student','partner','internal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  student_id uuid references profiles(id) on delete set null,
  external_reference text,
  item_label text not null,
  amount_vnd bigint not null check (amount_vnd >= 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','waived')),
  due_on date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  title_en text not null,
  title_vi text not null,
  body_en text not null,
  body_vi text not null,
  audience text not null default 'all' check (audience in ('all','students','teachers','partners')),
  published_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  title_en text not null,
  title_vi text not null,
  resource_type text not null check (resource_type in ('link','document','audio','video','teacher_guide','printable')),
  resource_url text not null,
  visibility text not null default 'all' check (visibility in ('all','students','teachers','partners')),
  created_at timestamptz not null default now()
);

-- Central evidence layer. This is intentionally metadata-first.
-- Large/sensitive learner artifacts should remain in learner-controlled storage.
create table if not exists learning_capsules (
  id uuid primary key default gen_random_uuid(),
  semantic_id text not null unique,
  learner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  source_type text not null check (source_type in ('activity_attempt','submission','teacher_observation','project','milestone')),
  source_id uuid,
  title_en text not null,
  title_vi text not null,
  evidence_summary jsonb not null default '{}'::jsonb,
  skill_tags text[] not null default '{}',
  mastery_level text,
  integrity_hash text,
  verified_by uuid references profiles(id) on delete set null,
  verified_at timestamptz,
  status text not null default 'draft' check (status in ('draft','verified','released','revoked')),
  sharing_scope text not null default 'private' check (sharing_scope in ('private','learner','organization','shareable')),
  achieved_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_memberships_org on organization_memberships(organization_id, role, status);
create index if not exists idx_classes_org on classes(organization_id, status);
create index if not exists idx_class_memberships_student on class_memberships(student_id, status);
create index if not exists idx_teacher_assignments_teacher on teacher_assignments(teacher_id);
create index if not exists idx_units_book on book_units(book_id, sort_order);
create index if not exists idx_activities_unit on activities(unit_id, sort_order);
create index if not exists idx_enrollments_student on student_enrollments(student_id, status);
create index if not exists idx_progress_enrollment on book_progress(enrollment_id, status);
create index if not exists idx_attempts_student on activity_attempts(student_id, submitted_at desc);
create index if not exists idx_attendance_class_date on attendance(class_id, session_date desc);
create index if not exists idx_assignments_class on assignments(class_id, status, due_at);
create index if not exists idx_submissions_student on submissions(student_id, status);
create index if not exists idx_capsules_learner on learning_capsules(learner_id, status, achieved_on desc);
create index if not exists idx_capsules_org on learning_capsules(organization_id, status);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'organizations_set_updated_at') then
    create trigger organizations_set_updated_at before update on organizations for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'profiles_set_updated_at') then
    create trigger profiles_set_updated_at before update on profiles for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'classes_set_updated_at') then
    create trigger classes_set_updated_at before update on classes for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'books_set_updated_at') then
    create trigger books_set_updated_at before update on books for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'activities_set_updated_at') then
    create trigger activities_set_updated_at before update on activities for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'submissions_set_updated_at') then
    create trigger submissions_set_updated_at before update on submissions for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'teacher_feedback_set_updated_at') then
    create trigger teacher_feedback_set_updated_at before update on teacher_feedback for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'learning_capsules_set_updated_at') then
    create trigger learning_capsules_set_updated_at before update on learning_capsules for each row execute function set_updated_at();
  end if;
end $$;
