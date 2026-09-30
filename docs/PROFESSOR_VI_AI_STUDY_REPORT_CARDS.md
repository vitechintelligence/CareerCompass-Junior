# Professor Vi AI Study Lab + School Report Card Studio

Status: **implementation branch only; production activation is gated**.

Branch: `feat/professor-vi-ai-study-report-cards`

This work extends `feat/operational-integration-closeout`. It does not bypass the production gates documented in `docs/production/PRODUCTION_GO_LIVE_GATES.md`.

## Professor Vi

Professor Vi is implemented as instructional intelligence, not a generic answer chatbot.

The deterministic teaching progression is:

`ASK → REFRAME → HINT → SCAFFOLD → PARTIAL MODEL → EXPLAIN → REVEAL → REFLECT → TRANSFER`

The application owns permissions, safety, answer-release rules, evidence semantics and institution policy. The model generates the teaching move/content only within those boundaries.

Learner Study Lab supports:

- learner-owned source uploads
- PDF, Word, PowerPoint and text study material
- source-grounded summaries
- study guides
- generated quizzes
- Socratic/guided tutoring
- Math/Science support using learner age/English context
- teacher review before release when institution policy requires it
- source-grounding metadata
- generated quizzes represented with the existing versioned Activity Contract
- duplicate-safe AI-generated attempts
- evidence semantics beginning at PRACTICED; deterministic correct objective results may become DEMONSTRATED

Professor Vi does not autonomously create official school grades.

## Governance

Three gates are required before learner AI can operate:

1. platform rollout flag: `CCJ_FEATURE_PROFESSOR_VI_AI_STUDY=true`
2. ViTech organization allocation: `professor_vi_ai_study_lab`
3. school policy: `professor_vi_policies.enabled=true`

Learner access additionally requires:

- active student account
- active institution membership
- active `ai_assistive_features` learner consent
- an institution AI transport policy that permits server AI

Platform-managed learner AI has its own live switch:

`CCJ_PROFESSOR_VI_LIVE_ENABLED=true`

It is intentionally separate from the platform-admin connectivity-test switch.

BYOK remains a separate institution-secret boundary and stays fail-closed until a tenant credential runtime is connected.

## Study-source handling

Uploaded study sources are sent to the configured model provider only after all access/policy checks pass. The platform stores provider file ID, source hash and minimal metadata rather than a second raw-file archive.

The provider upload uses an expiry window defined by school policy. Source deletion/retention jobs still need operational closeout before production use.

## School grading and report cards

Official grading is a separate institution-governed subsystem.

Control chain:

`ViTech feature allocation → school grading policy → school report-card template → school approval → reporting`

The school can:

- create versioned grading policies
- define its own scale/calculation/progression rules
- start from a Vietnam template
- start from a neutral ViTech template
- start blank
- remix a template
- upload/migrate its existing report-card form
- use the guided AI builder
- approve one active grading policy
- approve one active report-card template

AI creates **drafts only**. It cannot activate a grading policy or report-card template.

## Vietnam presets

The Vietnam starting structures are based on the report-card structures associated with:

- primary: Thông tư 27/2020/TT-BGDĐT
- lower/upper secondary: Thông tư 22/2021/TT-BGDĐT

They remain starting templates. The institution must confirm the current mandated form and local implementation before activation.

Other ASEAN countries use flexible starter templates until jurisdiction-specific forms are verified or supplied by the institution.

## New migration

`db/migrations/015_professor_vi_report_cards.sql`

The migration is additive and **must not be applied to production** until the existing Phase A production gates, rehearsal and restore-point requirements have been satisfied.

## Rollout switches

All remain OFF by default:

```
CCJ_FEATURE_PROFESSOR_VI_AI_STUDY=false
CCJ_PROFESSOR_VI_LIVE_ENABLED=false
CCJ_FEATURE_REPORT_CARD_BUILDER=false
CCJ_REPORT_CARD_AI_BUILDER_LIVE_ENABLED=false
```

## Validation requirement

Before integration/merge:

1. TypeScript typecheck
2. ESLint
3. Professor Vi policy tests
4. report-card builder tests
5. existing learning/evidence/authorization/activity-contract tests
6. production build
7. tenant/cross-role negative tests
8. Migration 015 rehearsal on an isolated compatible database branch
9. preview user journeys using synthetic/adult test accounts only
10. no production enablement until the documented production gates close
