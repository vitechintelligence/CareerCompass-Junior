-- Partner-controlled learner community, age-level access, quarterly challenges,
-- localized agreement records, institution data-mode preferences and showcase governance.
-- This migration is prepared only; do not apply to production without explicit approval.

create table organization_data_policies (
  organization_id uuid primary key references organizations(id) on delete cascade,
  evidence_storage_mode text not null default 'platform_metadata'
    check (evidence_storage_mode in ('platform_metadata','school_capsule','vng_cloud','local_browser','manual')),
  ai_mode text not null default 'off'
    check (ai_mode in ('off','byok','local_browser')),
  ai_provider text,
  byok_configured boolean not null default false,
  vng_status text not null default 'not_requested'
    check (vng_status in ('not_requested','requested','configured')),
  observability_mode text not null default 'metadata_only'
    check (observability_mode in ('metadata_only','disabled','self_hosted')),
  raw_student_content_tracing boolean not null default false,
  partner_acknowledged_data_responsibility boolean not null default false,
  configured_by uuid references profiles(id) on delete set null,
  configured_at timestamptz,
  updated_at timestamptz not null default now()
);

create table community_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  accepted_role text not null check (accepted_role in ('partner_admin','teacher')),
  locale text not null default 'vi' check (locale in ('vi','en')),
  terms_version text not null,
  privacy_version text not null,
  accepted boolean not null default true,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (organization_id, profile_id, terms_version, privacy_version)
);

create index idx_community_agreement_profile
  on community_agreement_acceptances(profile_id, accepted, accepted_at desc);

create table community_staff_permissions (
  organization_id uuid not null references organizations(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  can_initiate_seasons boolean not null default false,
  can_enable_students boolean not null default false,
  can_moderate boolean not null default false,
  can_assign_advisors boolean not null default false,
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, teacher_id)
);

create index idx_community_staff_teacher
  on community_staff_permissions(teacher_id, organization_id);

create table community_student_access (
  organization_id uuid not null references organizations(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  age_band text not null check (age_band in ('7-9','10-13','14-16','17-18')),
  status text not null default 'enabled' check (status in ('enabled','paused','revoked')),
  guardian_consent_confirmed boolean not null default false,
  learner_acknowledged boolean not null default false,
  consent_policy_version text,
  enabled_by uuid references profiles(id) on delete set null,
  enabled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, student_id)
);

create index idx_community_student_access_status
  on community_student_access(organization_id, status, age_band);

create table community_seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  semantic_id text not null unique,
  title_en text not null,
  title_vi text not null,
  year integer not null check (year between 2025 and 2100),
  quarter integer not null check (quarter between 1 and 4),
  theme_en text,
  theme_vi text,
  age_bands text[] not null default '{}',
  starts_on date not null,
  submission_due_on date not null,
  showcase_on date,
  status text not null default 'draft' check (status in ('draft','open','review','showcase','closed')),
  visibility text not null default 'organization' check (visibility in ('organization','network_pending','network')),
  leaderboard_mode text not null default 'podium_only' check (leaderboard_mode in ('hidden','podium_only','full')),
  allow_student_team_creation boolean not null default true,
  allow_peer_kudos boolean not null default false,
  max_team_size integer not null default 5 check (max_team_size between 1 and 30),
  advisor_feedback_required boolean not null default true,
  publish_advisor_feedback boolean not null default false,
  initiated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (submission_due_on >= starts_on),
  check (showcase_on is null or showcase_on >= submission_due_on),
  check (age_bands <@ array['7-9','10-13','14-16','17-18']::text[])
);

create unique index uq_community_season_org_quarter
  on community_seasons(organization_id, year, quarter);

create index idx_community_seasons_org_status
  on community_seasons(organization_id, status, year desc, quarter desc);

create table community_challenges (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references community_seasons(id) on delete cascade,
  semantic_id text not null unique,
  mission_key text not null,
  studio_key text not null check (studio_key in (
    'integrated-steam','science','technology','engineering','creative-design',
    'math-logic','green-innovation','robotics','ai-innovation','future-space','invention'
  )),
  age_band text not null check (age_band in ('7-9','10-13','14-16','17-18')),
  participation_mode text not null default 'small_group'
    check (participation_mode in ('individual','small_group','large_group')),
  min_team_size integer not null default 1 check (min_team_size between 1 and 30),
  max_team_size integer not null default 5 check (max_team_size between 1 and 30),
  title_en text not null,
  title_vi text not null,
  brief_en text not null,
  brief_vi text not null,
  deliverables jsonb not null default '[]'::jsonb,
  rubric jsonb not null default '{}'::jsonb,
  skills_focus text[] not null default '{}',
  bonus_rules jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_team_size >= min_team_size)
);

create index idx_community_challenges_season
  on community_challenges(season_id, status, age_band, participation_mode, studio_key);

create table community_advisors (
  season_id uuid not null references community_seasons(id) on delete cascade,
  advisor_profile_id uuid not null references profiles(id) on delete cascade,
  advisor_role text not null default 'mentor' check (advisor_role in ('mentor','judge','mentor_judge')),
  status text not null default 'active' check (status in ('active','inactive')),
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (season_id, advisor_profile_id)
);

create index idx_community_advisors_profile
  on community_advisors(advisor_profile_id, status);

create table community_teams (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references community_challenges(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  semantic_id text not null unique,
  join_code text not null unique,
  team_name text not null,
  project_title text,
  project_summary text,
  repository_url text,
  demo_url text,
  created_by uuid references profiles(id) on delete set null,
  advisor_profile_id uuid references profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active','submitted','finalist','winner','archived')),
  showcase_visibility text not null default 'team'
    check (showcase_visibility in ('team','organization','network_pending','network')),
  partner_approved_showcase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_community_team_name_challenge
  on community_teams(challenge_id, lower(team_name));

create index idx_community_teams_org
  on community_teams(organization_id, status, updated_at desc);

create index idx_community_teams_challenge
  on community_teams(challenge_id, status, updated_at desc);

create table community_team_members (
  team_id uuid not null references community_teams(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('creator','member')),
  status text not null default 'active' check (status in ('active','left')),
  joined_at timestamptz not null default now(),
  primary key (team_id, student_id)
);

create index idx_community_team_members_student
  on community_team_members(student_id, status);

create table community_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references community_teams(id) on delete cascade,
  version_number integer not null default 1 check (version_number between 1 and 100),
  title text not null,
  summary text not null,
  artifact_url text,
  repository_url text,
  demo_url text,
  reflection text,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','submitted','reviewed','showcase')),
  submitted_by uuid references profiles(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, version_number)
);

create index idx_community_submissions_team
  on community_submissions(team_id, status, submitted_at desc);

create table community_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references community_submissions(id) on delete cascade,
  advisor_profile_id uuid not null references profiles(id) on delete cascade,
  feedback_type text not null default 'advisor' check (feedback_type in ('advisor','judge')),
  strengths text not null,
  recommendations text not null,
  next_step text not null,
  rubric_scores jsonb not null default '{}'::jsonb,
  total_score numeric(6,2) check (total_score is null or (total_score between 0 and 105)),
  visibility text not null default 'team' check (visibility in ('team','partner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, advisor_profile_id, feedback_type)
);

create index idx_community_feedback_submission
  on community_feedback(submission_id, feedback_type, created_at desc);

create table community_kudos (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references community_seasons(id) on delete cascade,
  team_id uuid not null references community_teams(id) on delete cascade,
  given_by uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('inspiring','clever','teamwork','resilience','clear_explanation')),
  created_at timestamptz not null default now(),
  unique (season_id, team_id, given_by, kind)
);

create index idx_community_kudos_team
  on community_kudos(team_id, kind);

create table community_results (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references community_seasons(id) on delete cascade,
  team_id uuid not null references community_teams(id) on delete cascade,
  award_label text not null,
  placement integer check (placement is null or placement between 1 and 1000),
  published boolean not null default false,
  published_by uuid references profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, team_id)
);

create index idx_community_results_season
  on community_results(season_id, published, placement);

create trigger organization_data_policies_set_updated_at
  before update on organization_data_policies
  for each row execute function set_updated_at();

create trigger community_staff_permissions_set_updated_at
  before update on community_staff_permissions
  for each row execute function set_updated_at();

create trigger community_student_access_set_updated_at
  before update on community_student_access
  for each row execute function set_updated_at();

create trigger community_seasons_set_updated_at
  before update on community_seasons
  for each row execute function set_updated_at();

create trigger community_challenges_set_updated_at
  before update on community_challenges
  for each row execute function set_updated_at();

create trigger community_teams_set_updated_at
  before update on community_teams
  for each row execute function set_updated_at();

create trigger community_submissions_set_updated_at
  before update on community_submissions
  for each row execute function set_updated_at();

create trigger community_feedback_set_updated_at
  before update on community_feedback
  for each row execute function set_updated_at();

create trigger community_results_set_updated_at
  before update on community_results
  for each row execute function set_updated_at();
