# Institution Data, AI and Observability Controls

## Purpose

Career Compass Junior supports multiple institution operating modes without silently enabling AI or external data flows.

## Four learner delivery levels

- Ages 7–9 — approximate Grades 1–3: short language, icons, audio/visual support and one action at a time.
- Ages 10–13 — approximate Grades 4–6: guided planning, simple measurements, role cards and supported explanations.
- Ages 14–16 — approximate Grades 7–10: design briefs, constraints, technical vocabulary, test evidence and structured presentation.
- Ages 17–18 — approximate Grades 11–12: industry-style briefs, validation, trade-offs, portfolio evidence and career-facing technical communication.

The grade labels are implementation bands, not claims about an individual student's actual grade placement.

## Community governance

The institution controls:
- which learners are enabled;
- the assigned age level;
- teacher community permissions;
- rules, standards and moderation;
- advisors/judges;
- competition dates and leaderboard visibility;
- institution showcase publication.

A partner administrator may delegate selected controls to teachers. A learner cannot join merely because the account exists.

Community managers must accept the localized Community Terms & Privacy Notice before using management controls. The system stores the accepted policy versions and timestamp, not a scanned signature.

## Student permissions

Before community access is enabled, the institution records:
- confirmation that required parent/guardian permission has been obtained; and
- learner acknowledgement.

This record is an operational confirmation. It is not a substitute for the institution's underlying legal notices, consent evidence or other required documentation.

## Data modes

### Platform metadata baseline
Career Compass stores the minimum operational data required for authentication, roles, classes, progress and selected evidence metadata.

### School-controlled Intelligence Capsule
Target mode for schools that want richer learning evidence to remain in institution-controlled storage. The platform should retain only permitted references, integrity hashes and workflow metadata after the connector is fully configured.

### VNG Cloud localization request
Creates an explicit setup request for Vietnam-hosted infrastructure. Selection alone must not provision paid resources. Commercial use remains subject to VNG Cloud pricing and terms.

### Local browser
Supported activities keep state on the learner device and avoid remote model calls. Cross-device continuity, teacher reporting and collaborative features are reduced unless selected evidence is synchronized.

### Manual
No live AI is required. Teachers can run the learning/community workflow manually.

## Optional live AI

AI is off by default. When enabled:
- BYOK means the institution selects the provider and supplies its own key using a secure secret path;
- raw keys are never written to application tables, learner records or community content;
- local-browser AI may be used where a supported model/runtime exists;
- no autonomous high-stakes grading, diagnosis, sensitive-trait inference or fixed career prediction is permitted.

## LangSmith and technical support

LangSmith may be used for approved server-side workflow observability, evaluation and model-call governance.

Default policy:
- tracing disabled unless configured;
- raw student content tracing disabled;
- safe metadata only for technical support;
- self-hosted/disabled observability can be selected by the institution;
- tenant isolation remains an application/database responsibility.

The platform should never rely on tracing software as the boundary that prevents one institution's data from appearing in another institution.

## CTA timing

- Before the first community season opens: review terms and choose the institution data mode.
- When Intelligence Capsule is enabled: choose school-controlled Capsule, VNG localization or platform metadata.
- When an AI-assisted feature is first enabled: configure BYOK or Local Browser.
- When VNG Cloud is selected: show a separate paid-setup / terms review CTA.
- After repeated technical errors: show administrator-only technical diagnostics using safe trace IDs and metadata.
- In Manual mode: no recurring AI upsell inside normal student learning; assisted options remain available in administrator settings.

## Responsibility language

Do not state that ViTech has zero responsibility or stores no data while the platform processes operational records. The institution is responsible for its own community content, moderation, permissions and lawful use, while ViTech remains responsible for obligations applicable to the platform processing and security it actually performs.
