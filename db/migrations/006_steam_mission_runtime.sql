-- Reusable STEAM mission runtime and evidence model.
-- Community Bridge Designer is the first proof-of-concept; future missions reuse these tables.

create table if not exists learner_delivery_profiles (
  organization_id uuid not null references organizations(id) on delete cascade,
  learner_id uuid not null references profiles(id) on delete cascade,
  age_band text not null check (age_band in ('7-9','10-13','14-16','17-18')),
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, learner_id)
);

create index if not exists idx_learner_delivery_profiles_age
  on learner_delivery_profiles(organization_id, age_band, learner_id);

create table if not exists steam_missions (
  id uuid primary key default gen_random_uuid(),
  mission_key text not null unique,
  title_en text not null,
  title_vi text not null,
  simulation_type text not null check (simulation_type in (
    'bridge-builder','grid-logic','resource-system','systems-sandbox','prototype-studio'
  )),
  studios text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists steam_mission_versions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references steam_missions(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  age_band text not null check (age_band in ('7-9','10-13','14-16','17-18')),
  definition jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  unique (mission_id, version_number, age_band)
);

create index if not exists idx_steam_mission_versions_lookup
  on steam_mission_versions(mission_id, age_band, status, version_number desc);

create table if not exists steam_mission_runs (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references steam_missions(id) on delete restrict,
  mission_version_id uuid not null references steam_mission_versions(id) on delete restrict,
  learner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  age_band text not null check (age_band in ('7-9','10-13','14-16','17-18')),
  run_mode text not null default 'individual' check (run_mode in ('individual','small_group','large_group')),
  status text not null default 'in_progress' check (status in ('in_progress','completed','archived')),
  current_step text not null default 'discover',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  skill_summary jsonb not null default '{}'::jsonb,
  career_connections jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_steam_runs_learner
  on steam_mission_runs(learner_id, status, updated_at desc);

create index if not exists idx_steam_runs_org
  on steam_mission_runs(organization_id, status, updated_at desc);

create table if not exists steam_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references steam_mission_runs(id) on delete cascade,
  attempt_number integer not null check (attempt_number >= 1),
  design_state jsonb not null default '{}'::jsonb,
  outcome jsonb not null default '{}'::jsonb,
  observation text,
  change_from_previous text,
  result_state text not null default 'discovered'
    check (result_state in ('discovered','stable','needs_improvement')),
  created_at timestamptz not null default now(),
  unique (run_id, attempt_number)
);

create index if not exists idx_steam_attempts_run
  on steam_attempts(run_id, attempt_number);

create table if not exists steam_reflections (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references steam_mission_runs(id) on delete cascade,
  prompt_key text not null,
  response_type text not null default 'text' check (response_type in ('choice','text','voice_reference')),
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_steam_reflections_run
  on steam_reflections(run_id, created_at);

create table if not exists steam_skill_evidence (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references steam_mission_runs(id) on delete cascade,
  attempt_id uuid references steam_attempts(id) on delete set null,
  skill_key text not null,
  evidence_label text not null check (evidence_label in ('practiced','explored','demonstrated','improved')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_steam_skill_evidence_run
  on steam_skill_evidence(run_id, skill_key, created_at desc);

create table if not exists steam_teacher_observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references steam_mission_runs(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  observation text not null,
  skill_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_steam_teacher_observations_run
  on steam_teacher_observations(run_id, created_at desc);

do $
begin
  if not exists (select 1 from pg_trigger where tgname='learner_delivery_profiles_set_updated_at') then
    create trigger learner_delivery_profiles_set_updated_at
      before update on learner_delivery_profiles for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='steam_missions_set_updated_at') then
    create trigger steam_missions_set_updated_at
      before update on steam_missions for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='steam_mission_runs_set_updated_at') then
    create trigger steam_mission_runs_set_updated_at
      before update on steam_mission_runs for each row execute function set_updated_at();
  end if;
end $$;
