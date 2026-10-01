# Career Compass Junior Mastery

Bilingual interactive LMS for **students, teachers and partner organizations**, built around the Career Compass Junior curriculum and Mastery English learning journey.

## What is included in the platform

- Student Portal and interactive learner experience
- Live Teacher Class Workspace
- Live Partner / School / Training Center Workspace
- Neon Auth with controlled role assignment
- English + Vietnamese UI/content model
- Career Compass Junior interactive-book data model
- database-driven reusable book/unit renderer
- classes and organization memberships
- teacher activation and class assignments
- student enrollments and persistent book progress
- interactive activities and attempts
- attendance
- assignments and submissions
- teacher feedback
- payments status
- announcements and resources
- `learning_capsules` as the central learner evidence layer
- Neon PostgreSQL adapter
- Vercel-compatible Next.js app
- GitHub Actions CI

## Live routes

```text
/learn/unit-1?lang=en                 Enhanced Unit 1 learner experience
/learn/unit-1?lang=vi                 Vietnamese learner experience
/learn/CCJ-MASTERY-BEGINNER/U01       Database-driven curriculum view
/auth/sign-in                         Neon Auth sign-in
/auth/sign-up                         Learner activation
/workspace/teacher                    Role-protected Teacher Workspace
/workspace/partner                    Partner onboarding / management
```

Unit 1 provides eight lesson-specific learning experiences with bilingual navigation, Look · Listen · Say vocabulary, browser pronunciation, speaking models, retryable interactive checks, reflection and an ephemeral record → replay → retry speaking recorder.

Anonymous preview progress remains on-device. When a learner signs in, completed Unit 1 lessons synchronize to Neon `activity_attempts` and `book_progress`. Evidence-eligible milestones create metadata-only `learning_capsules`. Recorded learner audio is never uploaded by this flow.

## Stack

- Next.js 16
- React 19
- TypeScript
- Neon PostgreSQL
- Neon Auth / Better Auth
- Vercel

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Production URL

The canonical production origin is:

`https://career-compass-junior-vitech.vercel.app`

The legacy `career-compass-junior-lake.vercel.app` host permanently redirects to the canonical origin. Neon Auth trusted domains must include the canonical HTTPS origin exactly.

## Production stack alignment

Career Compass Junior production must resolve through one stack:

```text
Frontend
  https://career-compass-junior-vitech.vercel.app
      ↓
Next.js server actions / API routes
      ↓
Neon Managed Better Auth + Neon Postgres
      ↓
Career Compass LMS — royal-queen-79814128
```

Vercel Production must declare:

```text
NEON_PROJECT_ID=royal-queen-79814128
NEON_BRANCH_ID=br-shiny-meadow-b3ibu54h
DATABASE_URL=<pooled URL from that same branch>
NEON_AUTH_BASE_URL=<Auth URL from that same branch>
NEON_AUTH_COOKIE_SECRET=<32+ character secret>
NEXT_PUBLIC_APP_URL=https://career-compass-junior-vitech.vercel.app
```

`/api/health` checks database reachability, core/extended schema readiness, Auth configuration and non-secret runtime identity alignment. It does not expose connection strings, passwords, cookie secrets or tokens.

If `NEON_PROJECT_ID` is explicitly set to another project in production, database/Auth access is intentionally blocked rather than silently using the wrong backend.

## Environment

Configure server-only deployment variables:

```bash
NEON_PROJECT_ID=royal-queen-79814128
NEON_BRANCH_ID=br-shiny-meadow-b3ibu54h
DATABASE_URL=postgresql://...
NEON_AUTH_BASE_URL=https://.../neondb/auth
NEON_AUTH_COOKIE_SECRET=<32+-character-random-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Do not commit real credentials.

## Database

Bootstrap the core model with:

```text
db/schema.sql
```

Apply later additive migrations from:

```text
db/migrations/
```

Seed published curriculum metadata with:

```text
db/seed.sql
```

The seed intentionally contains **no real learner data**.

## Access model

Self-registration maps to learner/student access only. Teacher access is activated by an approved partner administrator, and partner-administrator access is separately approved. The application does not allow public self-promotion into staff or partner roles.

## Platform architecture

See [`docs/PLATFORM_ARCHITECTURE.md`](docs/PLATFORM_ARCHITECTURE.md) for role boundaries, data ownership, privacy rules, interactive-book structure and implementation stages.

## Engineering rule

`main` should remain deployable. Product work should normally move through a feature branch + pull request with CI passing before merge.


---

# ViTech Intelligence Stack — canonical architecture and engineering contract

> **Status:** This section is the canonical product/engineering direction for how Career Compass Junior integrates the ViTech Intelligence Stack. It distinguishes implemented CCJ foundations from target integrations. It does not override Phase A production gates, authorize production child-data processing, or make disconnected infrastructure appear operational.
>
> **Engineering rule:** Extend existing working CCJ systems. Do not rebuild the LMS, replace working authentication/database/curriculum flows, or create parallel authorization, evidence, integration, or AI systems merely to satisfy the architecture.

## 1. Canonical product boundaries

The ViTech Intelligence Stack consists of three independently commercializable but interoperable products.

### ViTech Intelligence Capsule

**Product definition**

ViTech Intelligence Capsule is a **hardware-agnostic, software-defined sovereign intelligence environment** deployed on compatible customer-owned or partner-supplied infrastructure.

The physical server is not manufactured or sold by ViTech unless an order explicitly says otherwise. The institution or hardware partner supplies the physical machine. ViTech supplies the Capsule software architecture, runtime, configuration, security controls, integration contracts, deployment specification, certification tests and lifecycle tooling.

The Capsule is the protected institutional intelligence boundary for:

- protected institutional data;
- approved institutional knowledge;
- AI context and memory;
- approved local model runtimes;
- encryption/key integrations;
- local storage and retention policy;
- governed release of context to applications or models;
- institution-controlled local, sovereign or air-gapped operation.

**Capsule is not merely a storage folder or database.** It is the protected environment in which institutional intelligence can live and execute.

### Halibut OS

**Product definition**

Halibut OS is ViTech's **software-based intelligence governance and orchestration control plane**.

It combines deterministic policy enforcement, identity/authorization integration, workflow orchestration, model/runtime routing, agent control, audit and human-approval mechanisms. Optional embedded AI may assist with reasoning, interpretation and administration, but must not replace deterministic authorization or security controls.

Canonical responsibility:

> **Halibut decides what intelligence is allowed to do, what information it may use, where a workload may execute, and when a human must approve an action.**

Halibut OS is software. It is not a replacement for Linux/Windows and is not itself the human authority. The institution remains above Halibut and defines the rules Halibut enforces.

### Swoosh

**Product definition**

Swoosh is ViTech's **governed trust and data/event exchange fabric**.

Its canonical operating phrase is:

> **Verify → Decide → Move**

Swoosh verifies trusted state and exchange authority, performs deterministic trust/policy decisions where applicable, and moves only approved information/events between authorized systems.

Swoosh connects applications, Halibut, Intelligence Capsules, LMS/SIS/LTI systems, external providers and other governed services without making the transport itself the source of truth for institutional records.

## 2. Human / Institutional Intelligence is the authority

The institution remains the highest authority in the architecture.

Examples include a school board, principal, authorized school administrator, business owner, security team, data-governance officer or appointed IT administrator.

The institution defines:

- who may access which resources;
- which roles exist;
- which data categories are protected;
- why data may be processed;
- whether AI is allowed;
- which AI/model providers are approved;
- whether protected context may leave institution-controlled infrastructure;
- when consent is required;
- when human approval is mandatory;
- retention/deletion expectations;
- local-only, hybrid or air-gapped requirements.

The architecture is therefore:

```text
HUMAN / INSTITUTIONAL AUTHORITY
             |
             | defines policy, purpose, approvals
             v
        HALIBUT OS
  governance + orchestration
             |
             | approved workload/exchange
             v
           SWOOSH
      Verify -> Decide -> Move
             |
             +--------------------+
             |                    |
             v                    v
INTELLIGENCE CAPSULE      APPROVED EXTERNAL SYSTEMS
 local data / context      LMS / SIS / LTI / AI / API
 local model runtime
```

AI never becomes the final authority over authentication, tenant isolation, legal permission, consent, security boundaries, key custody or mandatory human-approval gates.

## 3. Embedded stack inside Career Compass Junior vs standalone products

Career Compass Junior is the first ViTech reference application for the stack.

A normal hosted CCJ customer does **not** need to separately install standalone Halibut OS, Swoosh and an Intelligence Capsule merely to use CCJ.

CCJ carries the application-facing embedded components:

- **Halibut Embedded Runtime** — policy contracts, authorization hooks, model/runtime routing, consent/age restrictions, approval hooks and auditable decisions;
- **Swoosh Embedded Gateway** — governed exchange contracts, integration adapters, request/response envelopes and receipts;
- **Capsule Compatibility Layer** — discovery, attestation, capability negotiation, local-routing support and protected-context release contracts.

Standalone products remain separately deployable:

- **Halibut OS** — institution-wide control plane across many applications;
- **Swoosh Platform** — institution-wide governed trust/exchange infrastructure;
- **ViTech Intelligence Capsule** — institution-controlled sovereign intelligence environment.

The embedded CCJ components must use the same contracts as the standalone products so the customer can upgrade without rewriting CCJ.

## 4. Installation and institutional administration

Standalone Halibut OS is normally installed on **institution-controlled server infrastructure**, not on a principal's or employee's ordinary daily-use laptop.

Typical deployment:

```text
Authorized School / Business Administrator
                 |
          secured browser/admin console
                 |
                 v
        Institution-controlled server
        +---------------------------+
        | Halibut OS                |
        | policy/control plane      |
        | optional embedded AI      |
        | audit/approval runtime    |
        +-------------+-------------+
                      |
                    Swoosh
                      |
        Capsule / CCJ / LMS / SIS / AI
```

For a small institution, Halibut, Swoosh gateway components and Capsule runtime may coexist on one properly isolated certified node.

For larger institutions, they may be distributed across separate servers/clusters.

No student or ordinary employee should require direct operating-system access to the infrastructure host.

## 5. Halibut first-run workflow

A new standalone Halibut installation starts **fail-closed**.

Canonical initialization sequence:

```text
Install / provision Halibut OS
          |
          v
Verify software + host integrity
          |
          v
Create Institutional Root Administrator
          |
          v
Configure MFA / keys / audit identity
          |
          v
Choose institution type
          |
          v
Discover/register systems and optional Capsule
          |
          v
HALIBUT INSTITUTIONAL INTELLIGENCE WIZARD
          |
          v
Generate proposed policy baseline
          |
          v
Human review + modification
          |
          v
Simulation / policy tests
          |
          v
Human approval
          |
          v
Activate deterministic policy
```

External AI access, cross-system transfer and high-risk operations remain denied until explicitly allowed.

## 6. Halibut Institutional Intelligence Wizard

Halibut must not require a school principal or ordinary administrator to write YAML, policy code or prompts.

The wizard collects institutional intelligence through four supported paths:

1. **Guided questions** — plain-language questions about roles, access, AI use, data location, retention, approval and consent.
2. **Policy templates** — starting structures for schools, universities, businesses and other institution types.
3. **Document import** — upload institutional policies; optional AI extracts **proposed** rules only.
4. **Advanced policy editor/API** — structured policy-as-code interfaces for IT/security teams.

Example human rule:

> Teachers may view grades only for students in their assigned classes.

Machine-enforceable representation:

```text
ROLE      = teacher
RESOURCE  = student.grade
CONDITION = teacher.class_id == student.class_id
ACTION    = read
DECISION  = ALLOW
```

Example:

> Student identifiable data may not be sent to an external AI service.

```text
DATA_CLASS     = student_identifiable
MODEL_LOCATION = external
DECISION       = DENY
```

The human-facing console should present the resulting **Institutional Intelligence Map** in ordinary language.

## 7. Human approval and policy activation

AI may interpret institutional documents or draft policies, but it must never silently activate security policy.

Required pattern:

```text
Institutional document / human instruction
                 |
                 v
       optional AI interpretation
                 |
                 v
          PROPOSED POLICY
                 |
                 v
          HUMAN REVIEW
                 |
                 v
        SIMULATE / TEST
                 |
                 v
          HUMAN APPROVAL
                 |
                 v
    DETERMINISTIC ACTIVE POLICY
```

For sensitive environments, Halibut should support dual approval, for example:

```text
Policy/business owner approves intent
                +
IT/security administrator approves technical effect
                |
                v
          POLICY ACTIVE
```

## 8. Optional Halibut Embedded Intelligence

Halibut must work without a generative model.

### Halibut Core

Deterministic control-plane functions:

- authentication/identity integration;
- authorization;
- tenant/role/class boundaries;
- consent and age restrictions;
- data classification;
- policy engine;
- workflow orchestration;
- model/runtime routing;
- approval gates;
- audit;
- secrets/network restrictions.

### Halibut Intelligence — optional

Optional embedded intelligence may provide:

- **Policy Interpreter** — convert human language/documents into proposed policies;
- **Policy Advisor** — identify conflicts, gaps and unusual privileges;
- **Governance Explainer** — explain why a request was allowed or denied;
- **Workflow Planner** — propose governed workflows and approval points;
- **Operational Analyst** — summarize security/policy/runtime activity.

Embedded intelligence must not:

- grant itself privileges;
- silently change active security policies;
- override deterministic authorization;
- bypass Swoosh;
- decide consent is unnecessary;
- silently enable external models;
- expose secrets;
- override institution-required human approval.

Deployment options may include:

- **Halibut Core** — no embedded model;
- **Halibut Intelligence Local** — embedded local model on institution-controlled infrastructure;
- **Halibut Intelligence Hybrid** — deterministic local governance with approved external reasoning services.

## 9. Swoosh canonical architecture

Swoosh must preserve its deterministic trust core while adding/using the exchange path required by CCJ.

```text
SOURCE / SYSTEM OF RECORD
          |
          v
+-------------------------+
| SWOOSH TRUST DECISION   |
| Verify issuer/state     |
| Validate integrity      |
| Check expiry/revocation |
| Apply policy/freshness  |
| ALLOW / DENY / REVIEW   |
+------------+------------+
             |
             v
+-------------------------+
| SWOOSH EXCHANGE GATEWAY |
| schema/purpose binding  |
| minimum fields          |
| authenticated transport |
| replay protection       |
| receipts/reconciliation |
+------------+------------+
             |
             v
AUTHORIZED DESTINATION
```

The source system remains authoritative for the facts it owns.

The technical ability to connect two systems does not itself constitute permission to exchange data.

## 10. Governed Swoosh exchange envelope

A protected intelligence exchange must carry enough context for deterministic verification without leaking unnecessary content.

Target envelope fields include:

- exchange/request ID;
- institution/tenant identity;
- actor/service identity;
- purpose;
- requested capability;
- data classifications;
- specifically allowed fields/context;
- policy version/digest;
- source and intended destination;
- retention/expiry;
- nonce/replay protection;
- integrity/signature information;
- approval reference when required;
- trace/receipt correlation ID.

Swoosh should return a privacy-minimized decision/exchange receipt.

## 11. Intelligence Capsule product and certification model

ViTech does not need to manufacture the physical machine.

Canonical terminology:

- **Intelligence Capsule Compatible** — hardware meets minimum compatibility requirements;
- **Intelligence Capsule Certified Node** — hardware/firmware/security configuration passed ViTech validation;
- **ViTech Intelligence Capsule Certified (VICC)** — complete installed system passed applicable ViTech hardware, security, sovereignty and conformance tests.

VICC is a proprietary ViTech technical-conformance designation. It is not automatically ISO, government or statutory certification.

Target VICC capacity classes:

- **VICC Edge** — small school/training center/small business;
- **VICC Institutional** — larger school/university/medium enterprise;
- **VICC Enterprise** — large/regulated/high-availability deployment.

Target sovereignty profiles:

- **H1 Governed Hybrid** — approved external processing may be used through policy;
- **S1 Sovereign Local** — protected AI context and designated identifiable institutional information stay on institution-controlled infrastructure;
- **A1 Air-Gapped** — designated protected information has no normal external network data path; updates use controlled procedures.

Certification attaches to a tested deployment configuration and may require re-validation after material security/firmware/network/storage changes.

## 12. Capsule connection lifecycle

Selecting `school_capsule` in an application must **not** mean the Capsule is already connected.

Required lifecycle:

```text
REQUESTED
    |
    v
DISCOVERED
    |
    v
IDENTITY / KEY VERIFIED
    |
    v
ATTESTED
    |
    v
CAPABILITIES NEGOTIATED
    |
    v
POLICY VERIFIED
    |
    v
EXCHANGE TESTED
    |
    v
CONNECTED
```

Only a **CONNECTED** Capsule may receive production workloads.

Target advertised capabilities may include:

- Capsule ID;
- institution ID;
- VICC capacity class;
- sovereignty profile;
- supported model runtimes;
- supported storage/custody capabilities;
- supported workload types;
- key/signing identity;
- software version;
- health/readiness status.

## 13. Capsule Connector contract

CCJ/Halibut must not depend on a particular physical server vendor.

Target interface:

```ts
interface CapsuleConnector {
  discover(): Promise<CapsuleCapabilities>;
  attest(): Promise<CapsuleAttestation>;
  health(): Promise<CapsuleHealth>;

  invoke(
    request: GovernedIntelligenceRequest
  ): Promise<GovernedIntelligenceResponse>;
}
```

The connector is responsible for securely bridging Halibut/Swoosh to the institution-controlled Capsule runtime.

## 14. Professor Vi / Think Beyond reference workflow

Professor Vi is the first CCJ workload that should prove the complete stack.

Current provider-specific path must evolve toward:

```text
Learner
  |
  v
Career Compass Junior / Think Beyond
  |
  v
Halibut Embedded Runtime
  |
  |-- verify actor/tenant/class
  |-- verify age/consent
  |-- classify requested context
  |-- determine purpose
  |-- determine permitted runtime
  |-- determine approval requirement
  |
  v
Swoosh Embedded Gateway
  |
  |-- verify exchange authority
  |-- minimize payload
  |-- sign/authenticate exchange
  |-- replay/expiry protection
  |
  +-------------------+-------------------+
  |                   |                   |
  v                   v                   v
Capsule Local     Platform Managed   Institution BYOK
  |                   |                   |
  +-------------------+-------------------+
                      |
                      v
           Governed intelligence result
                      |
                      v
          response validation / receipt
                      |
                      v
                     CCJ
```

Professor Vi should request **a capability**, not directly call a named provider.

Example target routing result:

```ts
type IntelligenceRuntime =
  | "capsule_local"
  | "platform_managed"
  | "institution_byok"
  | "approved_external"
  | "none";
```

Provider implementations may change without changing Professor Vi's instructional protocol.

## 15. Sovereignty and fallback invariant

A local/sovereign policy must never silently degrade into external processing.

Example:

```text
Policy:
student_identifiable_context -> Capsule only

Capsule unavailable
        |
        v
Halibut decision = DENY / TEMPORARILY UNAVAILABLE
        |
        X
NO automatic OpenAI/Gemini/external fallback
```

Fallback may occur only when the institution's active policy explicitly permits that fallback for that data class and purpose.

## 16. Minimum-necessary intelligence principle

Across Capsule, Halibut and Swoosh:

> **An AI or external system should receive only the data and context required to perform the authorized task.**

A mathematics tutoring request should not automatically receive counselling notes, parent contact information or unrelated student records merely because those records exist.

Protected-context assembly must therefore be explicit, purpose-bound and auditable.

## 17. Security invariants

The following are architecture requirements, not optional UX preferences:

- fail closed when a required policy/runtime/connector cannot be verified;
- deterministic authorization overrides AI reasoning;
- tenant boundaries are enforced server-side;
- role/class/subject scopes are checked at the authoritative boundary;
- model choice does not override data-location policy;
- secrets are not stored in ordinary application policy rows;
- protected content is not placed in operational telemetry by default;
- external transfer requires an authorized route;
- replay/expiry checks apply to governed exchanges;
- signed or otherwise authenticated exchange identity is required for Capsule/standalone runtime connections;
- high-risk actions can require human approval;
- no cross-tenant learning from identifiable institutional content;
- no silent generalized model training on customer content;
- audit records should capture policy/decision/route metadata without unnecessarily duplicating protected payloads.

## 18. CCJ implementation mapping — what exists today

The following existing code is the baseline to extend, not replace.

### Implemented foundations

- `lib/professor-vi/protocol.ts` — deterministic instructional-intelligence state/progression;
- `lib/professor-vi/access.ts` — role, tenant, feature, school agreement, consent and pilot gates;
- `lib/professor-vi/context.ts` — bounded learner/institution context;
- `lib/professor-vi/runtime.ts` — current provider-specific preview runtime;
- `lib/organization-data-policy.ts` — institution storage/AI/observability policy;
- `app/workspace/partner/data-control/page.tsx` — current Institution Data & AI Control UI;
- `lib/exchange/runtime-policy.ts` — fail-closed intelligence runtime availability;
- `lib/integration-adapter-core.ts` — canonical person/class/enrollment/event contracts;
- `lib/provider-adapters.ts` — OneRoster, Google Classroom and Microsoft Teams Education normalizers;
- `lib/integration-job-executor.ts` — tenant-scoped job execution, locking, retry/dead-letter, reconciliation/events;
- existing integration/provider readiness diagnostics;
- existing tenant/role/class/privacy/consent/evidence boundaries;
- existing Activity Contract, durable attempts, evidence semantics and teacher-review workflows.

### Explicitly not connected yet

- standalone Halibut OS orchestrator;
- CCJ-to-Swoosh SDK/transport;
- Swoosh signed tenant-bound exchange transport for CCJ;
- Capsule discovery/attestation/health/invocation connector;
- local Capsule custody;
- local Capsule AI/model execution;
- provider-independent Professor Vi runtime;
- real tenant BYOK secret runtime;
- production learner AI egress;
- automatic `school_capsule` data relocation;
- a production-approved Capsule deployment.

A configuration value, database row, diagram or UI selection must never be represented as proof of a connected runtime.

## 19. Target CCJ code organization

New work should converge toward a reusable stack namespace while reusing existing modules.

```text
lib/intelligence-stack/
|
+-- contracts/
|   +-- policy.ts
|   +-- workload.ts
|   +-- exchange.ts
|   +-- receipt.ts
|
+-- halibut/
|   +-- policy-engine.ts
|   +-- runtime-router.ts
|   +-- data-classification.ts
|   +-- approvals.ts
|   +-- audit.ts
|
+-- swoosh/
|   +-- envelope.ts
|   +-- gateway.ts
|   +-- verification.ts
|   +-- receipts.ts
|   +-- replay-protection.ts
|
+-- capsule/
|   +-- connector.ts
|   +-- capabilities.ts
|   +-- attestation.ts
|   +-- health.ts
|   +-- provider.ts
|
+-- providers/
    +-- platform-managed.ts
    +-- institution-byok.ts
    +-- local-capsule.ts
```

This namespace must adapt existing CCJ policy/integration logic rather than duplicating it.

## 20. Implementation workflow and agreed execution scope

Legend:

- **[x]** implemented foundation already present in the repository;
- **[~]** partially implemented / contract exists but runtime is incomplete;
- **[ ]** agreed engineering work still to implement;
- **[GATE]** requires separate production acceptance before enablement.

### A. Preserve and formalize existing embedded governance

- [x] Preserve current tenant/role/class authorization and privacy gates.
- [x] Preserve deterministic Professor Vi instructional protocol.
- [x] Preserve institution data/AI policy records and administrator UI.
- [x] Preserve existing integration canonical objects, adapters, job retries and reconciliation.
- [x] Preserve fail-closed behavior for unsupported governed intelligence.
- [ ] Define shared `intelligence-stack/contracts` types around the existing implementation.
- [ ] Adapt current organization policies into a canonical Halibut policy decision contract.
- [ ] Add policy decision reason, policy version/digest and auditable route metadata.

### B. Build Halibut Embedded Runtime

- [~] Existing CCJ controls already perform Halibut-like policy decisions in multiple modules.
- [ ] Create a single Halibut embedded decision entry point.
- [ ] Add data classification + purpose-bound context rules.
- [ ] Add provider/runtime routing independent of Professor Vi.
- [ ] Add explicit approval requirements and approval references.
- [ ] Add deterministic `ALLOW / DENY / REVIEW_REQUIRED / UNAVAILABLE` outcomes.
- [ ] Add institutional-policy simulation tests.
- [ ] Keep generative AI outside the authorization path.

### C. Refactor Professor Vi to consume Halibut

- [x] Preserve the existing Professor Vi pedagogy/protocol.
- [~] Current runtime directly uses the current preview provider.
- [ ] Replace provider-specific invocation at the application layer with a Halibut workload request.
- [ ] Implement provider adapters behind the common runtime interface.
- [ ] Keep platform-managed provider support as one optional adapter.
- [ ] Add Capsule-local provider adapter.
- [ ] Add tenant-BYOK adapter only after secure secret runtime exists.
- [ ] Validate model response against the issued workload/route decision.
- [GATE] Keep learner production intelligence disabled until authenticated acceptance is complete.

### D. Connect Swoosh — Verify, Decide, Move

- [x] Preserve existing CCJ integration schemas, adapter diagnostics and job framework.
- [~] Standalone Swoosh repository already contains substantial deterministic trust-kernel work.
- [ ] Define the CCJ Swoosh exchange envelope and receipt contract.
- [ ] Add tenant/purpose/data-class/policy binding.
- [ ] Add expiry/nonce/replay protection.
- [ ] Add authenticated/signed transport abstraction.
- [ ] Add payload minimization before release.
- [ ] Add exchange receipt/reconciliation.
- [ ] Implement a CCJ Swoosh SDK/gateway adapter rather than copying Swoosh trust semantics into CCJ.
- [GATE] Contract-test against an approved Swoosh runtime before production enablement.

### E. Build Capsule Compatibility Layer

- [x] `school_capsule` exists as an institution policy option.
- [~] Current UI correctly states that a connector is required.
- [ ] Define Capsule identity and capability schemas.
- [ ] Implement discovery.
- [ ] Implement cryptographic/authenticated identity verification.
- [ ] Implement attestation contract.
- [ ] Implement health/readiness contract.
- [ ] Implement capability negotiation.
- [ ] Implement Capsule connection lifecycle: requested -> discovered -> attested -> tested -> connected.
- [ ] Implement governed `invoke()` contract.
- [ ] Add local model capability discovery.
- [ ] Add local storage/custody capability discovery.
- [ ] Add key-rotation/revocation handling.
- [GATE] Do not treat a Capsule as connected until end-to-end exchange tests pass.

### F. Enforce sovereignty profiles

- [ ] Represent H1 / S1 / A1 deployment policy explicitly.
- [ ] Implement local-only routing rules.
- [ ] Implement **no external fallback** when S1/A1 policy forbids it.
- [ ] Implement controlled fallback only where active policy allows it.
- [ ] Test Capsule offline/network partition scenarios.
- [ ] Test wrong tenant/wrong Capsule identity.
- [ ] Test expired/replayed exchange.
- [ ] Test key rotation and revoked connector identity.
- [ ] Test external-provider denial for protected data classifications.

### G. Institutional Intelligence administration

- [~] Current Data & AI Control screen provides the first administrative policy surface.
- [ ] Evolve the policy UX toward the Halibut Institutional Intelligence model.
- [ ] Add human-readable policy map.
- [ ] Add guided policy questions.
- [ ] Add policy simulation before activation.
- [ ] Add draft -> review -> approve -> activate lifecycle.
- [ ] Add optional dual approval for sensitive policy changes.
- [ ] Later: add document-to-proposed-policy interpretation when approved embedded intelligence is available.
- [ ] Never allow AI-generated policy to auto-activate.

### H. Optional Halibut Intelligence

- [ ] Keep Halibut Core fully usable without an LLM.
- [ ] Define optional Policy Interpreter contract.
- [ ] Define Policy Advisor contract.
- [ ] Define Governance Explainer contract.
- [ ] Define Workflow Planner contract.
- [ ] Define Operational Analyst contract.
- [ ] Require generated recommendations to remain advisory until approved where policy changes would result.
- [ ] Support local embedded intelligence where the institution requires local execution.

### I. VICC/Capsule deployment integration

- [ ] Encode VICC capacity/profile metadata in Capsule capability exchange.
- [ ] Add commissioning test contract.
- [ ] Add connection/readiness evidence suitable for a VICC deployment record.
- [ ] Keep hardware vendor-neutral.
- [ ] Do not imply government/ISO certification from VICC status.
- [ ] Make re-attestation/re-validation possible after material deployment changes.

### J. Repository/product reconciliation

- [~] `vitechintelligence/Intelligence-Capsule` currently contains an earlier VinaTrust credential/capability-verification boundary.
- [~] `vitechintelligence/swooshbyvitech` currently implements a strong private trust-decision kernel and is being built toward production trust infrastructure.
- [ ] Reconcile the Intelligence-Capsule repository with the canonical sovereign-intelligence product definition without discarding useful credential/trust work.
- [ ] Preserve Swoosh's deterministic trust core and add/standardize the **Move** exchange contract needed by CCJ.
- [ ] Establish standalone Halibut OS package/repository boundaries when extraction is ready.
- [ ] Keep CCJ as the first reference consumer of shared contracts, not the owner of standalone product internals.

### K. Validation and rollout discipline

- [x] Existing unsupported intelligence paths fail closed.
- [x] Existing Phase A risky features remain default-off.
- [ ] Unit tests for Halibut policy decisions.
- [ ] Contract tests for Swoosh envelopes/receipts.
- [ ] Contract tests for Capsule connector.
- [ ] Negative tenant/role/subject substitution tests.
- [ ] Replay, expiry, wrong-signature and revoked-key tests.
- [ ] Capsule unavailable/no-fallback tests.
- [ ] Provider-route policy tests.
- [ ] Synthetic/adult end-to-end Professor Vi -> Halibut -> Swoosh -> Capsule test.
- [ ] Independent review of exchange/privacy/security boundaries.
- [GATE] No real-child Capsule/learner intelligence rollout until Phase A and the separate intelligence-path acceptance criteria are closed.

## 21. Implementation order

Do the work in this order so the architecture is real rather than cosmetic:

```text
1. Shared contracts
        |
2. Halibut embedded decision API
        |
3. Professor Vi provider-independent routing
        |
4. Swoosh envelope + receipt contract
        |
5. CCJ Swoosh gateway/SDK adapter
        |
6. Capsule connector + lifecycle
        |
7. Capsule-local intelligence provider
        |
8. Sovereignty/no-fallback enforcement
        |
9. Institutional Intelligence admin UX
        |
10. Optional Halibut Intelligence assistants
        |
11. End-to-end/adversarial testing
        |
12. Independent acceptance
        |
13. Controlled rollout
```

Do not start by making a dashboard appear connected. Establish the contracts and server-side enforcement first.

## 22. Product invariants for future agents/developers

Any developer or AI agent working on the ViTech Intelligence Stack in CCJ must preserve these statements:

1. **Career Compass Junior is the application layer.**
2. **Halibut OS is the governance/orchestration control plane.**
3. **Swoosh is the Verify -> Decide -> Move governed trust/exchange fabric.**
4. **ViTech Intelligence Capsule is the optional institution-controlled sovereign intelligence environment.**
5. **Professor Vi / Think Beyond is an application/intelligence workload governed by Halibut; it is not Halibut itself.**
6. **The institution/human authority defines policy; Halibut enforces it.**
7. **Security and authorization are deterministic and fail closed.**
8. **Generative AI may reason inside allowed boundaries but may not override them.**
9. **Protected context is minimum-necessary, purpose-bound and tenant-isolated.**
10. **A local-only policy never silently falls back to external AI.**
11. **Swoosh transports only after the required trust/policy decision.**
12. **A `school_capsule` setting is not proof of a connected Capsule.**
13. **A diagram, feature flag or policy row is not a functioning integration.**
14. **Existing working CCJ curriculum, portals, evidence, auth and database systems must be preserved and extended.**
15. **Production activation is a separate acceptance decision from code completion.**

## 23. Definition of the successful CCJ reference implementation

The embedded ViTech Intelligence Stack can be called connected in CCJ only when all of the following are true:

- Professor Vi no longer depends on a provider-specific application call;
- Halibut issues deterministic, auditable runtime decisions;
- Swoosh verifies and carries the authorized exchange through a tested contract;
- a Capsule can be discovered, authenticated, attested and marked connected only after passing tests;
- protected local-policy workloads execute in the Capsule without external disclosure;
- prohibited fallback remains blocked during Capsule outage;
- CCJ can still use approved platform-managed/BYOK/external runtimes when the institution policy permits them;
- tenant/role/age/consent/purpose boundaries remain enforced;
- exchange receipts and runtime decisions are auditable without unnecessary protected payload duplication;
- the existing non-AI CCJ learning system continues to operate when the intelligence stack is unavailable;
- automated and adversarial tests pass;
- production acceptance remains explicitly gated and independently reviewed.

Until those conditions are met, documentation and UI must use truthful states such as **configured**, **requested**, **available for test**, **disconnected**, or **not production ready** rather than claiming the full stack is live.
