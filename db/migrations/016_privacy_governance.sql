-- Additive governance records. No existing consent is backfilled as family approval.
-- Rehearse on an isolated branch; this file does not approve onboarding or connect infrastructure.
BEGIN;
CREATE TABLE IF NOT EXISTS school_processing_agreements (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id),
  policy_version text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','suspended')),
  deployment_mode text NOT NULL CHECK (deployment_mode IN ('vitech_managed_cloud','hybrid_institution','capsule_private','institution_hosted_future')),
  school_legal_name text NOT NULL,
  school_contact text NOT NULL,
  vitech_contact text NOT NULL,
  processing_countries text NOT NULL,
  approved_providers text NOT NULL,
  retention_schedule text NOT NULL,
  agreement_reference text NOT NULL,
  privacy_review_reference text NOT NULL,
  cross_border_reference text,
  requested_by uuid NOT NULL REFERENCES profiles(id),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'approved' OR (reviewed_by IS NOT NULL AND reviewed_by <> requested_by AND reviewed_at IS NOT NULL AND deployment_mode='vitech_managed_cloud'))
);
CREATE TABLE IF NOT EXISTS learner_representative_authorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  representative_profile_id uuid NOT NULL REFERENCES profiles(id),
  evidence_reference text NOT NULL,
  verified_by uuid NOT NULL REFERENCES profiles(id),
  verified_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('active','revoked')),
  revoked_at timestamptz,
  CHECK (learner_id <> representative_profile_id AND verified_by <> learner_id AND verified_by <> representative_profile_id),
  UNIQUE (organization_id, learner_id, representative_profile_id),
  UNIQUE (id, organization_id, learner_id)
);
CREATE TABLE IF NOT EXISTS optional_processing_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  authority_id uuid NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('ai_assistive_features','guardian_reporting','community_showcase','industry_network','capsule_exchange')),
  policy_version text NOT NULL,
  learner_signed_at timestamptz,
  representative_signed_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,learner_id,purpose),
  FOREIGN KEY (authority_id,organization_id,learner_id) REFERENCES learner_representative_authorities(id,organization_id,learner_id)
);
CREATE TABLE IF NOT EXISTS privacy_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  actor_id uuid NOT NULL REFERENCES profiles(id),
  purpose text NOT NULL,
  policy_version text NOT NULL,
  action text NOT NULL CHECK (action IN ('agree','withdraw','authority_verified','authority_revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS privacy_rights_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  requested_by uuid NOT NULL REFERENCES profiles(id),
  request_type text NOT NULL CHECK (request_type IN ('access','correction','restriction','objection','withdrawal','deletion')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','acknowledged','in_review','completed','lawful_hold')),
  execution_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status NOT IN ('completed','lawful_hold') OR length(trim(coalesce(execution_reference,''))) >= 5)
);
CREATE TABLE IF NOT EXISTS adult_synthetic_pilot_accounts (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id),
  verified_by uuid NOT NULL REFERENCES profiles(id),
  evidence_reference text NOT NULL,
  expires_at timestamptz NOT NULL,
  CHECK (profile_id <> verified_by)
);
CREATE TABLE IF NOT EXISTS feature_pilot_scopes (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  class_id uuid NOT NULL REFERENCES classes(id),
  feature_key text NOT NULL CHECK (feature_key IN ('timedAssessments','learningWriteQuotas','offlineOutbox','professorViAiStudy')),
  enabled boolean NOT NULL DEFAULT false,
  approved_by uuid NOT NULL REFERENCES profiles(id),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (organization_id,class_id,feature_key)
);
CREATE INDEX IF NOT EXISTS idx_privacy_authority_learner ON learner_representative_authorities(organization_id,learner_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_privacy_rights_tenant ON privacy_rights_requests(organization_id,status,created_at);
CREATE TABLE IF NOT EXISTS privacy_governance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  actor_id uuid NOT NULL REFERENCES profiles(id),
  action text NOT NULL CHECK (action IN ('agreement_submitted','agreement_approved','agreement_suspended','rights_updated')),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
