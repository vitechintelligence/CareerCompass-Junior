# Administrator-Controlled Institution Builder

## Purpose

The institution builder turns the Career Compass Junior LMS into a controlled multi-institution platform without allowing public users to promote themselves into administrative roles.

The control plane lives at:

- `/workspace/admin` — ViTech platform administration
- `/workspace/partner` — approved school/training-center operations
- `/institution/[slug]` — generated white-label institution page

The bootstrap administrator is `labellesolutionservices@gmail.com`. Additional verified account emails can be supplied through `PLATFORM_ADMIN_EMAILS`.

## Human-in-the-loop sequence

1. A school or training center representative signs up as a normal learner account.
2. They submit a partner onboarding request.
3. A ViTech platform administrator reviews the request.
4. Approval creates/activates an organization, promotes the requester to `partner_admin`, and creates an active organization membership.
5. The administrator chooses which modules the institution will receive.
6. The administrator presses **Run LangGraph institution build**.
7. LangGraph scopes features, applies the Vietnam education/privacy baseline, configures the assistive-intelligence profile, and generates the institution page configuration.
8. The generated page remains `draft` until the administrator deliberately publishes it.
9. The partner can then manage classes, teachers, learners and consent records inside its own organization boundary.

## LangGraph nodes

`lib/langgraph/institution-builder.ts` defines a real `@langchain/langgraph` StateGraph:

`START → scope_features → vn_compliance_guardrails → intelligence_layer → compose_white_label → END`

The graph is deterministic by default. It does not need an LLM to provision an institution and does not send learner data to a model.

### Intelligence layer

The platform administrator can allocate:

- context-aware search
- human-reviewed summarization
- assistive recommendations

Guardrails are explicit:

- no autonomous role elevation
- no sensitive-trait inference
- no autonomous high-stakes grading
- no public publishing without administrator action

A future model provider can be integrated behind the same controls; the current profile is stored as `provider: unconfigured`.

## Feature allocation

Feature flags are stored in `organization_features` and are organization-scoped. The initial catalog includes:

- LMS core
- student / teacher / partner workspaces
- interactive books
- attendance
- assignments and feedback
- progress reporting
- parent reporting
- announcements
- resources
- payments
- mobile PWA
- localization
- integrations
- workflow automation
- learning capsules
- privacy controls
- audit events
- intelligence search / summarize / recommendations

## Privacy/compliance controls

The migration adds a metadata-first consent ledger. It intentionally does not require guardian identity documents or other sensitive identity evidence.

`learner_consent_records` can record:

- digital learning
- learning evidence
- guardian reporting
- assistive AI features

The product stores confirmation state and policy version. The institution remains responsible for its lawful basis, notices, approvals, retention decisions and actual operational compliance.

## Database migration

Apply:

`db/migrations/003_platform_control_plane.sql`

It adds:

- review fields on partner onboarding
- `workflow_runs`
- `organization_features`
- `institution_sites`
- `admin_audit_events`
- `learner_consent_records`

The migration is additive and was tested on a temporary Neon branch before production application.
