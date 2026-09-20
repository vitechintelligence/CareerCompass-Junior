-- K12 future-skills delivery, teacher classroom/assessment tools,
-- professional learning, company-school connector and custom integration requests.

alter table classes
  add column if not exists class_scope text not null default 'program',
  add column if not exists subject_label text,
  add column if not exists owner_teacher_id uuid references profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'classes_class_scope_check'
  ) then
    alter table classes
      add constraint classes_class_scope_check
      check (class_scope in ('program','teacher_custom'));
  end if;
end $$;

create index if not exists idx_classes_scope
  on classes(organization_id, class_scope, status);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  assessment_type text not null default 'quiz' check (assessment_type in ('quiz','exam','checkpoint')),
  title_en text not null,
  title_vi text not null,
  instructions_en text,
  instructions_vi text,
  status text not null default 'draft' check (status in ('draft','published','closed','archived')),
  due_at timestamptz,
  time_limit_minutes integer check (time_limit_minutes is null or (time_limit_minutes between 1 and 300)),
  max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  sort_order integer not null default 0,
  question_type text not null check (question_type in ('multiple_choice','short_text')),
  prompt_en text not null,
  prompt_vi text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  points numeric(8,2) not null default 1 check (points >= 0),
  created_at timestamptz not null default now()
);

create table if not exists assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  attempt_number integer not null default 1 check (attempt_number between 1 and 10),
  status text not null default 'started' check (status in ('started','submitted','reviewed')),
  score numeric(10,2),
  max_score numeric(10,2),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  unique (assessment_id, student_id, attempt_number)
);

create table if not exists assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references assessment_attempts(id) on delete cascade,
  question_id uuid not null references assessment_questions(id) on delete cascade,
  answer_text text,
  auto_correct boolean,
  awarded_points numeric(8,2),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  unique (attempt_id, question_id)
);

create index if not exists idx_assessments_class
  on assessments(class_id, status, due_at);

create index if not exists idx_assessment_attempts_student
  on assessment_attempts(student_id, status, submitted_at desc);

create index if not exists idx_assessment_attempts_assessment
  on assessment_attempts(assessment_id, status, submitted_at desc);

create table if not exists teacher_learning_progress (
  teacher_id uuid not null references profiles(id) on delete cascade,
  module_key text not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  evidence jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, module_key)
);

create index if not exists idx_teacher_learning_progress_status
  on teacher_learning_progress(teacher_id, status, updated_at desc);

create table if not exists integration_provider_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  requested_by uuid references profiles(id) on delete set null,
  provider_name text not null,
  provider_url text,
  use_case text not null,
  requested_capabilities text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','reviewing','approved','rejected','closed')),
  admin_note text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integration_provider_requests_org
  on integration_provider_requests(organization_id, status, created_at desc);

create table if not exists industry_partners (
  id uuid primary key default gen_random_uuid(),
  semantic_id text not null unique,
  company_name text not null,
  website text,
  sector text,
  overview_en text,
  overview_vi text,
  logo_url text,
  status text not null default 'pending' check (status in ('pending','verified','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists industry_roles (
  id uuid primary key default gen_random_uuid(),
  industry_partner_id uuid not null references industry_partners(id) on delete cascade,
  role_key text not null,
  title_en text not null,
  title_vi text not null,
  summary_en text,
  summary_vi text,
  skill_tags text[] not null default '{}',
  education_notes_en text,
  education_notes_vi text,
  age_relevance text[] not null default '{}',
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (industry_partner_id, role_key)
);

create table if not exists school_company_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  industry_partner_id uuid not null references industry_partners(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','active','declined','paused')),
  requested_by uuid references profiles(id) on delete set null,
  approved_by uuid references profiles(id) on delete set null,
  request_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, industry_partner_id)
);

create table if not exists industry_connection_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  requested_by uuid references profiles(id) on delete set null,
  company_name text not null,
  company_website text,
  sector text,
  collaboration_types text[] not null default '{}',
  note text,
  status text not null default 'pending' check (status in ('pending','reviewing','connected','closed')),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_industry_roles_partner
  on industry_roles(industry_partner_id, status, title_en);

create index if not exists idx_school_company_connections_org
  on school_company_connections(organization_id, status, updated_at desc);

create index if not exists idx_industry_connection_requests_org
  on industry_connection_requests(organization_id, status, created_at desc);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'assessments_set_updated_at') then
    create trigger assessments_set_updated_at before update on assessments for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'industry_partners_set_updated_at') then
    create trigger industry_partners_set_updated_at before update on industry_partners for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'industry_roles_set_updated_at') then
    create trigger industry_roles_set_updated_at before update on industry_roles for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'school_company_connections_set_updated_at') then
    create trigger school_company_connections_set_updated_at before update on school_company_connections for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'industry_connection_requests_set_updated_at') then
    create trigger industry_connection_requests_set_updated_at before update on industry_connection_requests for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'integration_provider_requests_set_updated_at') then
    create trigger integration_provider_requests_set_updated_at before update on integration_provider_requests for each row execute function set_updated_at();
  end if;
end $$;
