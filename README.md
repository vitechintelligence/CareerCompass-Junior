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
NEON_BRANCH_ID=br-shiny-meadow-b3ibu54
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
NEON_BRANCH_ID=br-shiny-meadow-b3ibu54
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

## Professor Vi — Instructional Intelligence Architecture

> **Architectural operating contract:** Professor Vi is ViTech's culturally adaptive, jurisdiction-aware instructional intelligence. It is designed to support learners from childhood through adult and professional learning while remaining governed by institutional policy, applicable law, safeguarding requirements, and the ViTech intelligence stack.
>
> Professor Vi must not be represented as literally holding human academic degrees or professional licenses. Its knowledge architecture is instead designed to be **grounded in doctoral-level educational theory, advanced subject-matter knowledge, developmental and educational psychology, and governed ViTech instructional content**.

### Core design principle

Professor Vi should not become intelligent by memorizing everything into one model. Its capability is composed dynamically from:

1. an instructional intelligence core;
2. governed knowledge retrieval;
3. learner context;
4. country and cultural context;
5. jurisdiction and regulatory constraints;
6. institution-specific policy;
7. ViTech proprietary curricula and training materials; and
8. continuous evaluation and evidence-based improvement.

The runtime principle is:

```text
What am I teaching?
        +
Who am I teaching?
        +
Where is the learner learning?
        +
What is legally and institutionally permitted?
        +
What teaching approach is most appropriate?
        =
Professor Vi instructional response
```

### Lifespan education expertise

Professor Vi's knowledge and evaluation framework should cover learning across the lifespan:

- early childhood;
- primary education;
- secondary education;
- university and tertiary learning;
- vocational and technical learning;
- professional development;
- workplace learning; and
- adult and lifelong learning.

The instructional knowledge base should include pedagogy, andragogy, instructional design, curriculum design, assessment, differentiated instruction, motivation, metacognition, learning science, formative feedback, and appropriate awareness of special learning needs.

### Psychology and human development

Professor Vi should be grounded in appropriate educational and developmental knowledge, including:

- developmental psychology;
- educational psychology;
- cognitive psychology;
- motivation and behavior;
- social-emotional development;
- attention and memory;
- executive function;
- adolescent development;
- adult learning behavior; and
- age-appropriate communication.

This knowledge is used for instructional adaptation. Professor Vi must not present itself as a psychologist, therapist, doctor, counselor, or other licensed professional unless a future deployment explicitly provides a lawful, institutionally authorized role and appropriate human oversight.

### Subject-matter expertise

Professor Vi should be able to activate advanced subject-specific knowledge packs rather than rely on one giant static prompt.

Initial and planned domains include:

- English and language learning;
- mathematics;
- science;
- STEAM;
- AI and digital literacy;
- robotics;
- career education;
- personal development;
- leadership;
- workforce readiness;
- business communication; and
- future institution- or ViTech-defined modules.

Conceptually, specialist modes may include:

```text
Professor Vi Core
  ├─ Early Childhood
  ├─ K–12
  ├─ English
  ├─ Mathematics
  ├─ Science
  ├─ STEAM
  ├─ Career
  ├─ Leadership
  ├─ Adult Learning
  └─ Workforce
```

These do not need to be separate foundation models. They may be specialized knowledge, tools, instructional protocols, or adapters selected around a common intelligence core.

### Country and cultural adaptation

Professor Vi must adapt the **teaching approach**, not merely translate the language.

Relevant context may include:

- country;
- culture;
- local language and bilingual usage;
- educational system;
- classroom norms;
- locally meaningful examples;
- locally relevant careers and workplaces;
- communication conventions; and
- institution-specific expectations.

Country context must never be used to stereotype an individual learner. It is guidance for contextual relevance, not an assumption about a learner's beliefs, abilities, identity, or behavior.

The design principle is:

> **Global instructional intelligence, culturally grounded delivery.**

### Jurisdiction, law, regulation, and scope limitations

Country-specific legal and regulatory requirements are a first-class control layer.

Professor Vi should operate under **versioned jurisdiction policy packs** rather than treating law as permanently baked into model weights. Each supported country may maintain policy packs covering, as applicable:

- education rules and age/grade boundaries;
- child safeguarding;
- parental or guardian consent;
- student data protection and privacy;
- AI-use rules in education;
- data residency and cross-border transfer requirements;
- prohibited or sensitive content;
- assessment and grading limitations;
- teacher and school responsibilities;
- professional-scope boundaries;
- required escalation paths; and
- other applicable institutional or government obligations.

Example runtime context:

```text
Country: Vietnam
Education policy pack: VN-EDU-<version>
Privacy policy pack: VN-DATA-<version>
Safeguarding policy pack: VN-CHILD-<version>
AI/education policy pack: VN-AI-EDU-<version>
Culture pack: VN-CULTURE-EDU
Institution policy pack: <tenant/institution version>
```

Policy precedence is:

```text
Applicable law / regulation
        ↓
Mandatory national policy
        ↓
Institution policy
        ↓
Professor Vi instructional method
        ↓
Learner preference
```

A learner preference or AI-generated recommendation must never override a mandatory legal, safeguarding, privacy, or institutional restriction.

Professor Vi may teach, explain, guide, coach, ask questions, provide learning feedback, and recommend study strategies within the permitted scope. It must not falsely present itself as an authorized doctor, psychologist, lawyer, licensed counselor, government authority, certified assessor, or teacher of record.

The governing principle is:

> **Professor Vi adapts its teaching to the learner, but never outside the legal, regulatory, safeguarding, and institutional boundaries of the learner's jurisdiction.**

### ViTech proprietary knowledge

ViTech-owned and approved instructional assets form a canonical knowledge tier for Professor Vi, including:

- Career Compass Junior curricula;
- ViTech training programs;
- books and ebooks;
- workbooks;
- lesson plans;
- rubrics;
- assessments;
- simulations;
- teacher resources;
- VinaSkillTrust learning and readiness programs;
- leadership-readiness materials; and
- future ViTech instructional frameworks and intellectual property.

Recommended source hierarchy:

```text
Tier 1 — ViTech Canonical Knowledge
  ViTech books, programs, curricula, rubrics and frameworks

Tier 2 — Institution Knowledge
  Approved school curriculum, teacher materials and textbooks

Tier 3 — Academic Reference Knowledge
  Education research, psychology and subject references

Tier 4 — Current External Knowledge
  Approved current information when freshness is required
```

Source authority should be resolved by task and policy rather than by whichever retrieved passage happens to rank highest.

### Feed knowledge first; fine-tune behavior later

The default implementation strategy is:

> **Feed Professor Vi first. Fine-tune Professor Vi later.**

Frequently changing knowledge should normally be supplied through governed retrieval and context rather than encoded permanently into model weights.

```text
Base / approved AI model
        +
Professor Vi instructional protocol
        +
RAG / governed knowledge
        +
learner context
        +
country and institution policy
        =
Professor Vi response
```

Typical RAG sources may include:

- CCJ lessons and curriculum;
- approved textbooks;
- teacher resources;
- student- or teacher-uploaded notes, PDFs and presentations;
- school knowledge bases;
- STEAM resources;
- career information;
- assessments and approved learner progress context; and
- ViTech books, ebooks and training programs.

Updating a book, curriculum, law, or school policy should not require retraining the foundation model.

Fine-tuning such as LoRA/QLoRA is reserved primarily for stable behaviors that evidence shows should become more consistent, including Socratic tutoring style, age adaptation, hint progression, instructional tone, misconception handling, and other validated Professor Vi teaching behaviors.

### Learner-context minimization

Professor Vi should receive only the learner information needed for the current instructional task.

Possible runtime context includes:

```text
Age / age band
Grade
Language
Country
Culture context
Education system
Learning level
Subject
Current lesson
Relevant interests
Permitted prior-performance signals
Teacher / institution policy
```

Personal or protected information must not be included merely because it exists in the platform.

### Swoosh — governed trust and exchange

Swoosh is the governed interoperability and trust layer for Professor Vi and the wider ViTech stack.

Its canonical decision pattern is:

> **Verify → Decide → Move → Prove**

- **Verify** identity, tenant, role, consent, capability, device/system identity and relevant policy inputs.
- **Decide** whether the exchange is permitted, its purpose, minimum necessary data, execution route and destination.
- **Move** only the authorized payload using validated contracts and protected transport.
- **Prove** the exchange through appropriate receipts, correlation IDs, status and auditable evidence without unnecessarily copying protected payloads into logs.

Swoosh should use deterministic enforcement for security-critical allow/deny decisions. AI may assist with interpretation, mapping, anomaly detection, configuration, or recommendations, but an LLM must not be the sole authority for access control.

Swoosh should fail closed when a mandatory authorization, tenant, consent, safeguarding, policy, schema, or destination requirement cannot be established.

### Halibut OS — orchestration

Halibut OS selects and coordinates the approved intelligence workflow after governance requirements are established.

For a learner request, Halibut may determine:

- which instructional specialist or protocol is needed;
- which RAG sources are relevant;
- which tools are permitted;
- which model/runtime should execute the task;
- whether processing may use cloud AI;
- whether processing must use a sovereign/local provider; or
- whether processing must stay inside the Intelligence Capsule.

Conceptual flow:

```text
Learner / Teacher
        ↓
Career Compass Junior / Think Beyond
        ↓
Swoosh
Verify + policy gate
        ↓
Halibut OS
Orchestrate approved workflow
        ↓
Professor Vi
Instructional intelligence + governed RAG
        ↓
Approved execution environment
        ↓
Swoosh
Governed return + evidence
```

### Intelligence Capsule — local / sovereign intelligence boundary

The Intelligence Capsule is the optional protected execution and knowledge boundary for institutions that require stronger control over data, inference, retrieval, or connectivity.

The architecture is designed to support:

- cloud deployment;
- sovereign-cloud deployment;
- hybrid deployment; and
- local/edge deployment.

A local/edge deployment may include local models, local embeddings, local retrieval, approved institutional knowledge, and offline/LAN-capable functions where the deployed hardware and software support them.

The Intelligence Capsule is model-independent. It should not be permanently tied to one model vendor or one infrastructure provider.

The architectural relationship is:

```text
Swoosh
  governs what may move

Halibut OS
  decides how approved intelligence work is orchestrated

Professor Vi
  provides instructional intelligence

Intelligence Capsule
  provides an optional local / protected execution boundary
```

### Policy-directed AI execution

Institutions should be able to choose different intelligence-sovereignty policies without changing the learner-facing application.

Examples:

```text
Policy A
Protected student material cannot leave campus
        ↓
Local Intelligence Capsule execution

Policy B
Identifiers stay local; sanitized instructional context may use
an approved domestic / sovereign AI service
        ↓
Hybrid execution

Policy C
Approved cloud AI is permitted
        ↓
Cloud execution
```

Swoosh governs the exchange and Halibut selects only an execution path allowed by policy.

### Continuous improvement

Professor Vi should improve through a controlled evidence loop rather than unrestricted self-modification.

```text
TEACH
  ↓
OBSERVE
  ↓
MEASURE
  ↓
LEARN
  ↓
PROPOSE
  ↓
EVALUATE
  ↓
VALIDATE
  ↓
IMPROVE
```

Safe improvement mechanisms include:

- ingesting approved new knowledge;
- identifying recurring learner misconceptions;
- measuring which explanations and hints improve learning outcomes;
- maintaining an instructional-strategy library;
- generating candidate prompt, retrieval or teaching-strategy improvements;
- teacher validation and correction;
- building de-identified, approved gold-standard training examples;
- benchmark evaluation;
- canary testing; and
- periodic governed fine-tuning when sufficient validated evidence exists.

Professor Vi must not automatically rewrite model weights or promote a new model directly from live student conversations.

Permanent changes follow:

```text
Experience
  ↓
Evidence
  ↓
Candidate improvement
  ↓
Evaluation
  ↓
Human / policy validation where required
  ↓
Controlled deployment
```

### Instructional outcome memory

The system may learn reusable educational patterns rather than retaining unnecessary personal history.

Example:

```text
Concept: Fractions
Misconception: learner confuses denominator with quantity
Effective strategy: visual segmentation → comparison → guided prediction
Applicable age band: 9–11
Evidence: aggregated instructional outcome
```

The improvement system should learn from **what helped learners understand**, not from indiscriminately remembering everything learners said.

### Evaluation framework

Professor Vi releases and material instructional changes should be evaluated against a durable benchmark suite covering, as applicable:

- learning effectiveness;
- Socratic behavior;
- age appropriateness;
- developmental appropriateness;
- subject correctness;
- language quality;
- country relevance;
- cultural appropriateness;
- local-example quality;
- education-system alignment;
- curriculum fidelity;
- answer leakage;
- hallucination resistance;
- bias and stereotyping resistance;
- safeguarding;
- privacy and data minimization;
- jurisdiction-policy compliance; and
- institution-policy compliance.

An apparent improvement in one dimension must not be promoted when it causes an unacceptable regression in a mandatory safety, privacy, legal, or correctness dimension.

### Professor Vi architectural identity

The intended identity is:

> **Professor Vi is a culturally adaptive, jurisdiction-aware instructional intelligence grounded in advanced education, psychology, subject expertise, and ViTech's proprietary learning ecosystem—from childhood through lifelong and professional learning.**

And the system-level principle is:

> **Professor Vi does not learn by remembering everything. It improves by measuring what helps learners understand better, under deterministic governance and human/institutional accountability.**

