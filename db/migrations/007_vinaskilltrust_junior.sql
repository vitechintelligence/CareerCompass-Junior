-- VinaSkillTrust Junior: Grade 11-12 school-company connection and moderated simulation layer.

alter table industry_connection_requests
  add column if not exists company_email text,
  add column if not exists company_contact_name text,
  add column if not exists target_grades text[] not null default '{}',
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists eligibility_version text,
  add column if not exists industry_partner_id uuid references industry_partners(id) on delete set null,
  add column if not exists delivery_status text not null default 'not_sent'
    check (delivery_status in ('not_sent','queued','sent','failed')),
  add column if not exists company_response_status text not null default 'awaiting'
    check (company_response_status in ('awaiting','accepted','declined','more_info')),
  add column if not exists last_invited_at timestamptz;

alter table school_company_connections
  add column if not exists target_grades text[] not null default '{}',
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists eligibility_version text;

create table if not exists vst_junior_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  request_id uuid references industry_connection_requests(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  eligibility_version text not null,
  grade_eligibility_confirmed boolean not null default false,
  data_responsibility_confirmed boolean not null default false,
  bridge_role_confirmed boolean not null default false,
  moderation_confirmed boolean not null default false,
  accepted_at timestamptz not null default now(),
  unique (request_id, profile_id)
);

create table if not exists vst_junior_company_invitations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references industry_connection_requests(id) on delete cascade,
  token_hash text not null unique,
  company_email text not null,
  expires_at timestamptz not null,
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued','sent','failed')),
  provider_message_id text,
  delivery_error text,
  sent_at timestamptz,
  response_status text not null default 'awaiting'
    check (response_status in ('awaiting','accepted','declined','more_info')),
  responder_name text,
  responder_title text,
  response_note text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vst_junior_simulations (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references vst_junior_company_invitations(id) on delete cascade,
  request_id uuid not null references industry_connection_requests(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  industry_partner_id uuid references industry_partners(id) on delete set null,
  company_name text not null,
  title text not null,
  summary text not null,
  instructions text not null,
  target_grades text[] not null default '{}',
  safety_notes text,
  status text not null default 'submitted'
    check (status in ('submitted','reviewing','approved','rejected','published','archived')),
  moderation_note text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vst_junior_acceptances_org
  on vst_junior_agreement_acceptances(organization_id, accepted_at desc);
create index if not exists idx_vst_junior_invitations_response
  on vst_junior_company_invitations(response_status, created_at desc);
create index if not exists idx_vst_junior_simulations_moderation
  on vst_junior_simulations(status, created_at asc);
create index if not exists idx_vst_junior_simulations_org
  on vst_junior_simulations(organization_id, status, updated_at desc);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='vst_junior_company_invitations_set_updated_at') then
    create trigger vst_junior_company_invitations_set_updated_at
      before update on vst_junior_company_invitations
      for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='vst_junior_simulations_set_updated_at') then
    create trigger vst_junior_simulations_set_updated_at
      before update on vst_junior_simulations
      for each row execute function set_updated_at();
  end if;
end $$;
