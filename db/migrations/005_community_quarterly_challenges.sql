-- Developer-style learner community, quarterly competitions, team showcases and advisor feedback.
-- Partner-controlled by default. Network-wide showcase requires a separate platform-admin review step.

create table if not exists community_seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  semantic_id text not null unique,
  title_en text not null,
  title_vi text not null,
  year integer not null check (year between 2025 and 2100),
  quarter integer not null check (quarter between 1 and 4),
  theme_en text,
  theme_vi text,
  track_scope text[] not null default '{}',
  age_bands text[] not null default '{}',
  starts_on date not null,
  submission_due_on date not null,
  showcase_on date,
  status text not null default 'draft' check (status in ('draft','open','review','showcase','closed')),
  visibility text not null default 'organization' check (visibility in ('organization','network_pending','network')),
  allow_student_team_creation boolean not null default true,
  allow_peer_kudos boolean not null default false,
  max_team_size integer not null default 4 check (max_team_size between 1 and 8),
  advisor_feedback_required boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (submission_due_on >= starts_on),
  check (showcase_on is null or showcase_on >= submission_due_on)
);

create unique index if not exists uq_community_season_org_quarter
  on community_seasons(organization_id, year, quarter);

create index if not exists idx_community_seasons_org_status
  on community_seasons(organization_id, status, year desc, quarter desc);

create table if not exists community_challenges (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references community_seasons(id) on delete cascade,
  semantic_id text not null unique,
  track text not null check (track in ('stem','steam','ai-foundation','ai-level-2','robotics','open')),
  age_band text check (age_band is null or age_band in ('7-9','10-12','13-15','16-18')),
  future_skills_unit_code text,
  title_en text not null,
  title_vi text not null,
  brief_en text not null,
  brief_vi text not null,
  deliverables jsonb not null default '[]'::jsonb,
  rubric jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_challenges_season
  on community_challenges(season_id, status, track, age_band);

create table if not exists community_advisors (
  season_id uuid not null references community_seasons(id) on delete cascade,
  advisor_profile_id uuid not null references profiles(id) on delete cascade,
  advisor_role text not null default 'mentor' check (advisor_role in ('mentor','judge','mentor_judge')),
  status text not null default 'active' check (status in ('active','inactive')),
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (season_id, advisor_profile_id)
);

create index if not exists idx_community_advisors_profile
  on community_advisors(advisor_profile_id, status);

create table if not exists community_teams (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references community_challenges(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  semantic_id text not null unique,
  team_name text not null,
  project_title text,
  project_summary text,
  repository_url text,
  demo_url text,
  created_by uuid references profiles(id) on delete set null,
  advisor_profile_id uuid references profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active','submitted','finalist','winner','archived')),
  showcase_visibility text not null default 'team' check (showcase_visibility in ('team','organization','network_pending','network')),
  partner_approved_showcase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_community_team_name_challenge
  on community_teams(challenge_id, lower(team_name));

create index if not exists idx_community_teams_org
  on community_teams(organization_id, status, updated_at desc);

create index if not exists idx_community_teams_challenge
  on community_teams(challenge_id, status, updated_at desc);

create table if not exists community_team_members (
  team_id uuid not null references community_teams(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('creator','member')),
  status text not null default 'active' check (status in ('active','left')),
  joined_at timestamptz not null default now(),
  primary key (team_id, student_id)
);

create index if not exists idx_community_team_members_student
  on community_team_members(student_id, status);

create table if not exists community_submissions (
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

create index if not exists idx_community_submissions_team
  on community_submissions(team_id, status, submitted_at desc);

create table if not exists community_feedback (
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

create index if not exists idx_community_feedback_submission
  on community_feedback(submission_id, feedback_type, created_at desc);

create table if not exists community_results (
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

create index if not exists idx_community_results_season
  on community_results(season_id, published, placement);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='community_seasons_set_updated_at') then
    create trigger community_seasons_set_updated_at
      before update on community_seasons for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='community_challenges_set_updated_at') then
    create trigger community_challenges_set_updated_at
      before update on community_challenges for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='community_teams_set_updated_at') then
    create trigger community_teams_set_updated_at
      before update on community_teams for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='community_submissions_set_updated_at') then
    create trigger community_submissions_set_updated_at
      before update on community_submissions for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='community_feedback_set_updated_at') then
    create trigger community_feedback_set_updated_at
      before update on community_feedback for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='community_results_set_updated_at') then
    create trigger community_results_set_updated_at
      before update on community_results for each row execute function set_updated_at();
  end if;
end $$;
