-- LTI 1.3 / LTI Advantage Tool Provider runtime.
-- Additive migration only. Do not apply to production until reviewed and explicitly approved.

create table if not exists lti_platform_registrations (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null unique references integration_installations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  platform_name text not null,
  issuer text not null,
  client_id text not null,
  deployment_id text not null,
  auth_login_url text not null,
  auth_token_url text not null,
  jwks_url text not null,
  status text not null default 'active' check (status in ('pending','active','disabled')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (issuer, client_id, deployment_id)
);

create index if not exists idx_lti_registrations_lookup
  on lti_platform_registrations(issuer, client_id, status);

create index if not exists idx_lti_registrations_org
  on lti_platform_registrations(organization_id, status, updated_at desc);

create table if not exists lti_oidc_states (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references lti_platform_registrations(id) on delete cascade,
  state_hash text not null unique,
  nonce_hash text not null,
  target_link_uri text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_lti_oidc_state_expiry
  on lti_oidc_states(expires_at, consumed_at);

create table if not exists lti_context_links (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references lti_platform_registrations(id) on delete cascade,
  external_context_id text not null,
  class_id uuid not null references classes(id) on delete cascade,
  context_label text,
  context_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, external_context_id),
  unique (registration_id, class_id)
);

create index if not exists idx_lti_context_class
  on lti_context_links(class_id);

create table if not exists lti_launch_sessions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references lti_platform_registrations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  message_type text not null check (message_type in ('LtiResourceLinkRequest','LtiDeepLinkingRequest')),
  external_context_id text,
  external_resource_link_id text,
  session_token_hash text not null unique,
  service_claims jsonb not null default '{}'::jsonb,
  deep_link_settings jsonb not null default '{}'::jsonb,
  target_path text not null default '/workspace',
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_lti_launch_session_profile
  on lti_launch_sessions(profile_id, expires_at desc);

create index if not exists idx_lti_launch_session_org
  on lti_launch_sessions(organization_id, expires_at desc);

drop trigger if exists lti_platform_registrations_set_updated_at on lti_platform_registrations;
create trigger lti_platform_registrations_set_updated_at
  before update on lti_platform_registrations
  for each row execute function set_updated_at();

drop trigger if exists lti_context_links_set_updated_at on lti_context_links;
create trigger lti_context_links_set_updated_at
  before update on lti_context_links
  for each row execute function set_updated_at();
