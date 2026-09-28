# Classroom Revision Workflow — Phase 7

Career Compass now treats assignments as a learning loop rather than a publish/list feature.

## Learner states

1. Not started / draft
2. Submitted revision
3. Teacher review
4. Returned for revision or verified/closed
5. Returned work becomes editable again
6. Resubmission creates a new immutable revision

The current `submissions` row remains the fast current-state record. `submission_revisions` preserves submitted history.

## Duplicate safety

Each rendered learner submit form carries a UUID submission key. The submit query takes an assignment+learner advisory transaction lock before checking/incrementing the revision, so double-click/replay of the same key resolves to the same immutable revision.

## Teacher review

Teacher feedback is linked to the exact `submission_revision_id`. Review supports:
- Return for revision -> submission status `returned`
- Verify / close -> submission status `accepted`

A stale/non-submitted revision cannot be reviewed.

## Needs My Attention

Teacher dashboard separates:
- submitted revisions awaiting review
- learners working on returned revisions
- overdue learner-assignment items
- draft evidence milestones awaiting verification

## Evidence direction

Phase 8 will use this revision/feedback provenance to create verified evidence and bilingual guardian reporting without rewriting revision history.

## Migration

Prepared migration: `db/migrations/011_assignment_revision_workflow.sql`.

Production application remains approval-gated.
