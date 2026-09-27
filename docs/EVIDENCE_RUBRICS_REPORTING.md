# Evidence, Rubrics and Guardian Reporting — Phase 8

## Evidence levels

Career Compass keeps the evidence semantics introduced in Phase 2:
- practiced
- demonstrated
- verified

Assessment scores can produce `demonstrated` only against an explicit assessment threshold. A score alone never produces `verified`; teacher verification is explicit.

## Assignment provenance

When a teacher verifies/closes an assignment revision, Career Compass writes a verified learning capsule containing:
- learner
- assignment
- submission and immutable revision
- evaluator
- evaluation type
- feedback
- score when supplied
- result
- verification time
- integrity hash

## Assessment provenance

Assessments now carry:
- content version
- explicit demonstrated threshold
- per-question bilingual learning objectives
- rubric guidance

Attempts carry:
- assessment content version
- reviewer and review feedback
- rubric result
- evidence level
- duplicate-safe submission ID/hash

Auto-scored objective attempts may create demonstrated draft evidence. Open responses remain practiced until teacher review. Teacher review can leave the result practiced/demonstrated or explicitly verify it.

## Guardian report

The small bilingual report at `/workspace/teacher/learner/[studentId]/report` summarizes:
- what was practiced
- what was demonstrated / verified
- what improved through revisions
- what to work on next
- a deterministic try-at-home suggestion

The report fails closed unless an active institution-scoped `guardian_reporting` consent with guardian confirmation exists. It is intentionally not a second parent portal.

## Migration

Prepared migration: `db/migrations/012_evidence_rubrics_reporting.sql`.

Production application remains approval-gated.
