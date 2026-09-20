-- Platform control plane, administrator-approved provisioning, LangGraph runs,
-- white-label institution pages, feature allocation and privacy controls.

alter table partner_onboarding_requests
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  workflow_key text not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  triggered_by uuid references profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists organization_features (
  organization_id uuid not null references organizations(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  source text not null default 'admin' check (source in ('admin','langgraph','migration')),
  allocated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, feature_key)
);

create table if not exists institution_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  locale text not null default 'vi' check (locale in ('vi','en')),
  headline text not null,
  summary text not null,
  status text not null default 'draft' check (status in ('draft','published','paused')),
  theme jsonb not null default '{}'::jsonb,
  modules jsonb not null default '{}'::jsonb,
  intelligence_profile jsonb not null default '{}'::jsonb,
  compliance_profile jsonb not null default '{}'::jsonb,
  generated_by uuid references profiles(id) on delete set null,
  last_graph_run_id uuid references workflow_runs(id) on delete set null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references profiles(id) on delete set null,
  organization_id uuid references organizations(id) on delete cascade,
  event_type text not null,
  target_type text,
  target_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists learner_consent_records (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  consent_type text not null check (consent_type in ('digital_learning','learning_evidence','guardian_reporting','ai_assistive_features')),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  learner_confirmation boolean not null default false,
  guardian_confirmation boolean not null default false,
  policy_version text not null default '2026-01',
  captured_by uuid references profiles(id) on delete set null,
  captured_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (learner_id, organization_id, consent_type, policy_version)
);

create index if not exists idx_workflow_runs_org
  on workflow_runs(organization_id, started_at desc);

create index if not exists idx_organization_features_enabled
  on organization_features(organization_id, enabled, feature_key);

create index if not exists idx_institution_sites_status
  on institution_sites(status, updated_at desc);

create index if not exists idx_admin_audit_org
  on admin_audit_events(organization_id, created_at desc);

create index if not exists idx_learner_consent_org
  on learner_consent_records(organization_id, learner_id, status);
