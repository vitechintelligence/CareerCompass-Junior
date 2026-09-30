-- Phase A extension: Professor Vi learner AI Study Lab + institution-governed grading/report-card builder.
-- PREPARED ONLY. Do not apply to production until the production go-live gates and rehearsal are complete.

-- Keep platform-managed AI distinct from institution BYOK.
alter table organization_data_policies
  drop constraint if exists organization_data_policies_ai_mode_check;

alter table organization_data_policies
  add constraint organization_data_policies_ai_mode_check
  check (ai_mode in ('off','byok','local_browser','platform_managed'));

create table if not exists professor_vi_policies (
  organization_id uuid primary key references organizations(id) on delete cascade,
  enabled boolean not null default false,
  allowed_modes text[] not null default array['summary','study_guide','quiz','socratic','math_science']::text[],
  answer_release_strictness text not null default 'guided'
    check (answer_release_strictness in ('guided','balanced','direct_when_stuck')),
  require_teacher_review_generated_packs boolean not null default true,
  allow_source_uploads boolean not null default true,
  allowed_source_types text[] not null default array['pdf','ppt','pptx','txt','md','doc','docx','pasted_text']::text[],
  max_source_bytes integer not null default 10485760 check (max_source_bytes between 1024 and 52428800),
  retention_days integer not null default 30 check (retention_days between 1 and 365),
  primary_language text not null default 'vi',
  cefr_target text,
  intervention_intensity text not null default 'adaptive'
    check (intervention_intensity in ('light','adaptive','high_support')),
  configured_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists ai_study_sources (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  title text not null,
  source_type text not null
    check (source_type in ('pdf','ppt','pptx','txt','md','doc','docx','pasted_text')),
  original_filename text,
  mime_type text,
  provider text not null default 'openai',
  provider_file_id text,
  source_hash text not null,
  bytes integer not null default 0 check (bytes >= 0),
  status text not null default 'ready'
    check (status in ('uploading','ready','failed','expired','deleted')),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  deleted_at timestamptz
);

create unique index if not exists uq_ai_study_source_learner_hash
  on ai_study_sources(learner_id, organization_id, source_hash)
  where status in ('uploading','ready');

create index if not exists idx_ai_study_sources_learner
  on ai_study_sources(learner_id, organization_id, created_at desc);

create table if not exists ai_study_packs (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  source_id uuid not null references ai_study_sources(id) on delete cascade,
  pack_type text not null check (pack_type in ('summary','study_guide','quiz')),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  grounding_refs jsonb not null default '[]'::jsonb,
  model_provider text,
  model_name text,
  generation_mode text not null default 'live'
    check (generation_mode in ('live','deterministic_mock')),
  teacher_review_required boolean not null default true,
  review_status text not null default 'draft'
    check (review_status in ('draft','pending_review','approved','changes_requested','released','archived')),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_study_packs_learner
  on ai_study_packs(learner_id, organization_id, created_at desc);

create index if not exists idx_ai_study_packs_review
  on ai_study_packs(organization_id, review_status, created_at desc);

create table if not exists ai_generated_activities (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references ai_study_packs(id) on delete cascade,
  learner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  source_id uuid not null references ai_study_sources(id) on delete cascade,
  activity_code text not null,
  content_version integer not null default 1 check (content_version >= 1),
  activity_contract jsonb not null,
  contract_hash text not null,
  status text not null default 'released'
    check (status in ('draft','released','archived')),
  created_at timestamptz not null default now(),
  unique (pack_id, activity_code, content_version)
);

create index if not exists idx_ai_generated_activities_learner
  on ai_generated_activities(learner_id, organization_id, created_at desc);

create table if not exists ai_generated_attempts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references ai_generated_activities(id) on delete cascade,
  learner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  submission_id uuid not null unique,
  response jsonb not null default '{}'::jsonb,
  evaluation jsonb not null default '{}'::jsonb,
  evidence_level text not null default 'PRACTICED'
    check (evidence_level in ('PRACTICED','SELF_REPORTED','DEMONSTRATED','VERIFIED')),
  teacher_review_status text not null default 'not_required'
    check (teacher_review_status in ('not_required','pending','verified','changes_requested')),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_generated_attempts_learner
  on ai_generated_attempts(learner_id, organization_id, created_at desc);

create table if not exists ai_tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  source_id uuid references ai_study_sources(id) on delete set null,
  lesson_mode text not null default 'ai'
    check (lesson_mode in ('english','career','steam','ai','reflection','assessment','math_science')),
  pedagogical_state text not null default 'ASK'
    check (pedagogical_state in ('ASK','REFRAME','HINT','SCAFFOLD','PARTIAL_MODEL','EXPLAIN','REVEAL','REFLECT','TRANSFER')),
  learner_state jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','closed','escalated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_tutor_sessions_learner
  on ai_tutor_sessions(learner_id, organization_id, updated_at desc);

create table if not exists ai_tutor_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ai_tutor_sessions(id) on delete cascade,
  role text not null check (role in ('learner','professor_vi','system_event')),
  content text not null,
  pedagogical_state text,
  source_refs jsonb not null default '[]'::jsonb,
  educational_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_tutor_messages_session
  on ai_tutor_messages(session_id, created_at);

-- School-owned grading rules remain separate from Professor Vi.
create table if not exists school_grading_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  country_code text not null default 'VN',
  education_level text not null default 'custom',
  policy_source text not null default 'school'
    check (policy_source in ('school','government_template','imported','ai_builder','vitech_template')),
  version_number integer not null default 1 check (version_number >= 1),
  grading_scale jsonb not null default '{}'::jsonb,
  calculation_rules jsonb not null default '{}'::jsonb,
  academic_periods jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_by uuid references profiles(id) on delete set null,
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, version_number)
);

create unique index if not exists uq_school_grading_policy_active
  on school_grading_policies(organization_id)
  where status='active';

create table if not exists report_card_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  grading_policy_id uuid references school_grading_policies(id) on delete set null,
  code text not null,
  name text not null,
  country_code text not null default 'VN',
  education_level text not null default 'custom',
  source_type text not null default 'blank'
    check (source_type in ('vitech_template','country_template','school_import','ai_builder','blank')),
  version_number integer not null default 1 check (version_number >= 1),
  schema_version integer not null default 1 check (schema_version >= 1),
  layout_schema jsonb not null default '{}'::jsonb,
  field_mapping jsonb not null default '{}'::jsonb,
  print_profile jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_by uuid references profiles(id) on delete set null,
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code, version_number)
);

create unique index if not exists uq_report_card_template_active
  on report_card_templates(organization_id)
  where status='active';

create table if not exists report_card_builder_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  mode text not null default 'guided'
    check (mode in ('guided','blank','remix','import')),
  country_code text,
  education_level text,
  answers jsonb not null default '{}'::jsonb,
  generated_template_id uuid references report_card_templates(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','generated','approved','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_report_card_builder_org
  on report_card_builder_sessions(organization_id, created_at desc);
