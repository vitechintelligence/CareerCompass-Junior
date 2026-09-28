# Curriculum QA and Evidence Timeline — Phase 9

The internal QA workflow reviews the same server-owned activity contract used by learners.

## Reviewer view

For each activity the platform administrator can inspect:
- activity/book/unit identity
- bilingual objective and instructions
- activity/input type
- authoritative answer definition
- rubric definition
- feedback rules
- age band and English level
- completion rule
- evidence policy
- content version
- QA status and notes

QA states: unreviewed, in_review, needs_changes, approved.

Objective activities cannot be marked approved if their required contract fields or authoritative answer are missing.

## Test as Learner

The admin simulation calls the real evidence evaluator but writes no learner attempt, progress, score record or learning capsule.

## Learner evidence timeline

Students can open a chronological timeline that keeps practice, submitted revisions, assessments and evidence capsules visibly separate. The timeline preserves source type, content/assessment versions, revision numbers, scores and review feedback where available.

## Migration

Prepared migration: `db/migrations/013_curriculum_qa.sql`.

Production application remains approval-gated.
