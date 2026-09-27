# Versioned Activity Contract — Phase 4

Career Compass Junior keeps the existing curriculum, activity, assignment and evidence tables. Phase 4 adds one shared server contract instead of a second LMS/content engine.

## Contract fields

The server contract supports:
- activity ID and semantic activity code
- course/book ID
- unit ID
- explicit lesson ID when published, otherwise the activity code
- activity type
- content version
- bilingual language context
- explicit age band and English level from curriculum metadata
- bilingual learning objective and instructions
- input type
- server-only answer definition
- rubric definition
- feedback rules
- completion rule
- evidence policy
- assigned enrollment ID in the launch envelope

The learner-facing serializer removes answer definitions and answer-key fields.

## Version rules

- `activities.content_version` identifies the current published definition version.
- New learner attempts store the exact `activity_content_version`, contract version, full server contract snapshot and contract SHA-256.
- A learner request that supplies an old content version receives `content_version_mismatch` instead of writing evidence against a newer definition.
- Assignments that reference a curriculum activity can pin the activity version and contract snapshot.
- Historical attempt snapshots are not rewritten when curriculum content changes.

## Explicit learner context

Class records now have separate optional fields:
- `grade_level`
- `learner_age_band`
- `english_level`

These are never inferred from class names. The VinaSkillTrust Junior Grade 11–12 gate uses `classes.grade_level` directly and fails closed when it is absent.

## Migration

Prepared migration: `db/migrations/009_versioned_activity_contract.sql`.

It has been verified on an isolated Neon migration branch. Production application requires explicit approval.

## Future Professor Vi / study-aid use

Professor Vi and uploaded study materials must consume this same contract/evidence model:
- generated questions require an explicit source/version;
- generated answer keys stay server-side;
- AI-generated activity completion must not auto-award verified mastery;
- grade, age band, language and English level must come from explicit profile/class/content context;
- generated artifacts should cite their source material and remain reviewable.
