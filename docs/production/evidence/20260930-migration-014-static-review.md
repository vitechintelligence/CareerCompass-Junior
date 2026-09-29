# Migration 014 Static Technical Review — 2026-09-30

Status: **TECHNICAL PRECHECK COMPLETE; INDEPENDENT DB-OWNER/REVIEWER SIGN-OFF OPEN.**

Repository: `vitechintelligence/CareerCompass-Junior`  
Branch: `feat/operational-integration-closeout`  
Migration: `db/migrations/014_operational_closeout.sql`

## Exact-file findings

The checked-in migration is additive in shape.

- No `DROP`, `RENAME`, `TRUNCATE`, `DELETE FROM` or `ALTER COLUMN` statement was found.
- Existing-table NOT NULL additions have defaults:
  - `teacher_learning_progress.evidence_status DEFAULT 'not_submitted'`
  - `integration_sync_jobs.attempt_count DEFAULT 0`
  - `integration_sync_jobs.max_attempts DEFAULT 3`
- Two guarded `DO $$ ... $$` blocks add CHECK constraints only when absent.
- New tables carry their own NOT NULL requirements and do not require backfilling existing rows.

## Existing-data / lock risks requiring fresh rehearsal

1. Unique partial index `idx_steam_attempts_submission_id` on existing non-null `steam_attempts.submission_id`.
2. Unique partial index `idx_steam_runs_active_context` on existing in-progress STEAM runs.
3. Index creation on existing STEAM / teacher-learning / integration tables can acquire locks; duration must be measured on a fresh production branch.

Required duplicate queries are already documented in `docs/production/PRODUCTION_GO_LIVE_GATES.md`.

## Decision

Builder technical result: **no destructive SQL identified; proceed only to fresh-production rehearsal.**

This artifact is not the independent approval required by A0.3. A named database owner + independent reviewer must read the exact final file and sign the Phase A evidence decision.
