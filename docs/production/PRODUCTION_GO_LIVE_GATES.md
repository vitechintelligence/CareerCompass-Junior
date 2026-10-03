# Career Compass Junior — Production Go-Live Gates and Migration 014 Runbook

> **Mandatory production handoff.** Every human or AI agent working on the production build must read this file and `agent.md` before changing production infrastructure, authentication, Neon, Vercel, feature flags, or PR #50.
>
> **PR #50 stays Draft until Phase A is closed with linked evidence.** A green CI result or a builder statement is not sufficient evidence.
>
> Source: the owner-supplied 8-page “Career Compass Junior — Go-Live Checklist and Migration 014 Runbook”, normalized into repository Markdown and checked against the current `db/migrations/014_operational_closeout.sql`.

## Scope

- Repository: `vitechintelligence/CareerCompass-Junior`
- PR: **#50 — Phase 11 operational and integration remediation closeout**
- Current scoped head when this gate document was introduced: `c2ec15b864dd14e24a43cb582e01349a19ee1ed3`
- Production Neon project: `Career Compass LMS`
- Neon project ID: `royal-queen-79814128`
- Production branch: `br-shiny-meadow-b3ibu54h`
- Canonical production origin: `https://career-compass-junior-vitech.vercel.app`
- Migration: `db/migrations/014_operational_closeout.sql`

## Non-negotiable process

1. Sequence remaining work by **risk**, not by feature-list order.
2. Phase B must not begin until Phase A is closed end-to-end with no unresolved conflict or failure.
3. Every checklist row needs a **named human owner** before that gate starts.
4. Every closed item needs linked evidence under `docs/production/evidence/` or in PR #50.
5. Keep PR #50 Draft until Phase A is closed.
6. Do not apply migration 014 to production from an AI-only decision. Production DB/auth/destructive-risk actions require explicit human approval and a watcher/verifier.
7. Do not use “builder says done” or self-authored tests alone as go-live evidence.
8. For real children’s data, remain adults-only/internal until the children’s-data compliance gate is signed off.

## Owner register — must be completed before Gate 0 starts

| Responsibility | Named owner | Required before |
| --- | --- | --- |
| Product owner | **[NAME REQUIRED]** | Gate 1 |
| Independent quality reviewer — not the builder | **[NAME REQUIRED]** | Gate 0 |
| Privacy owner | **[NAME REQUIRED]** | Gate 0 / Gate 8 |
| Database owner / migration executor | **[NAME REQUIRED]** | Gate 2 |
| Database watcher / verifier | **[NAME REQUIRED]** | Gate 2 |
| Engineering lead | **[NAME REQUIRED]** | Gate 0 |
| Operations / Vercel owner | **[NAME REQUIRED]** | Gate 0 |
| Security / BYOK owner | **[NAME REQUIRED]** | Gate 4 |
| Integrations owner | **[NAME REQUIRED]** | Gate 4 |
| QA / device owner | **[NAME REQUIRED]** | Gate 5 |
| Curriculum lead | **[NAME REQUIRED]** | Gate 7 |
| Qualified children’s-data compliance reviewer | **[NAME REQUIRED]** | Gate 8 |

---

# Phase A — Before touching production

## Gate 0 — Independent review

### A0.1 Authorization and role-boundary review
- **Owner:** [NAME REQUIRED] — independent reviewer, not the builder
- **Exit criterion:** learner, guardian, teacher, partner/admin and platform-admin paths are intentionally tested for cross-role and cross-tenant access on every new/changed endpoint; no IDOR remains, or every finding is fixed and re-tested.
- **Required attack cases:**
  - Learner A attempts Learner B enrollment, attempt, assignment, assessment, export, evidence timeline and report IDs.
  - Learner in Organization A attempts Organization B class/enrollment/report IDs.
  - Guardian link for Learner A attempts Learner B and another organization.
  - Teacher attempts a class not assigned to that teacher.
  - Partner admin attempts an organization not managed by that partner.
  - Non-admin attempts admin curriculum QA, teacher-evidence review, platform AI and integration execution.
  - Existing valid IDs are substituted deliberately to test authorization after object lookup.
- **Evidence:** request/response matrix with expected vs actual status, identity used, endpoint, tenant/class context, and fix commit when applicable.
- **Rollback/fallback:** keep PR #50 Draft; do not merge.

### A0.2 Export and deletion/lifecycle review
- **Owner:** [NAME REQUIRED] — independent reviewer + privacy owner
- **Exit criterion:**
  - authenticated export contains only the requesting subject’s permitted data;
  - no cross-learner/cross-tenant data appears;
  - deletion behavior is described accurately as a **review request** unless a real deletion/anonymization workflow exists;
  - institutional-retention and backup/PITR implications are documented;
  - no UI or copy falsely promises immediate erasure when only review is implemented.
- **Required checks:**
  - compare export rows to direct subject-scoped DB queries;
  - inspect identifiers, feedback, consent, evidence, class and organization relationships;
  - verify `Cache-Control: no-store` and attachment handling;
  - verify deletion-review request cannot target another learner by parameter substitution.
- **Rollback/fallback:** disable export/deletion-review feature flag; adults-only pilot can continue without it.

### A0.3 Migration 014 line-by-line SQL review
- **Owner:** [NAME REQUIRED] — DB owner + independent reviewer
- **Exit criterion:** every statement is classified additive/destructive, lock risk is noted, uniqueness/backfill behavior is understood, and the exact checked-in file is approved.
- **Rollback/fallback:** do not run.

#### Static review already performed against the current file — preliminary, not independent sign-off

Current `014_operational_closeout.sql` is additive in shape:
- no `DROP`, `RENAME`, `TRUNCATE`, or `DELETE FROM`;
- added nullable STEAM fields: `steam_mission_runs.reflection`, `steam_mission_runs.explanation`, `steam_attempts.submission_id`;
- added `teacher_learning_progress.evidence_status NOT NULL DEFAULT 'not_submitted'` plus nullable review fields;
- added `integration_sync_jobs.attempt_count NOT NULL DEFAULT 0` and `max_attempts NOT NULL DEFAULT 3` plus nullable runtime fields;
- new tables are additive: assessment sessions, quota windows, integration job events, reconciliation, guardian links and data lifecycle requests;
- two guarded `DO $$ … $$` blocks add CHECK constraints only when absent.

**Existing-data risk requiring rehearsal:**
- `idx_steam_runs_active_context` is a **unique partial index on an existing table** for active STEAM runs.
- `idx_steam_attempts_submission_id` is a unique partial index on an existing table; existing rows with null `submission_id` do not collide.
- indexes created on existing tables may take locks and must be timed on a fresh production branch.

Run these duplicate checks **before migration 014** on the fresh production rehearsal branch:

```sql
-- Current 014 active-run uniqueness.
SELECT
  learner_id,
  organization_id,
  mission_id,
  mission_version_id,
  run_mode,
  count(*) AS duplicate_count
FROM steam_mission_runs
WHERE status = 'in_progress'
GROUP BY
  learner_id,
  organization_id,
  mission_id,
  mission_version_id,
  run_mode
HAVING count(*) > 1;

-- Existing non-null submission IDs would block the new partial unique index.
SELECT
  submission_id,
  count(*) AS duplicate_count
FROM steam_attempts
WHERE submission_id IS NOT NULL
GROUP BY submission_id
HAVING count(*) > 1;
```

Record zero rows or an explicitly reviewed data-resolution plan. Do not resolve production duplicates ad hoc during the migration window.

### A0.4 Secrets and environment separation
- **Owner:** [NAME REQUIRED] — Ops + Security
- **Exit criterion:** Preview and Development are proven unable to use production Neon/auth credentials; Vercel environment scopes and provider secrets are audited; production branch identity is independently checked.
- **Required checks:**
  - Vercel Production, Preview and Development env values reviewed separately.
  - Preview `DATABASE_URL` and auth endpoint do **not** identify `br-shiny-meadow-b3ibu54h`.
  - Production runtime identifies project `royal-queen-79814128` and branch `br-shiny-meadow-b3ibu54h`.
  - `OPENAI_API_KEY` and future tenant BYOK secrets are server-only.
  - No credential appears in repository, logs, integration job detail, error detail or client bundle.
- **Rollback/fallback:** rotate exposed credentials immediately and keep preview/provider features disabled.

## Gate 1 — Admin identity, before verified-email tightening

### A1.1 Verify current admin
- **Owner:** [NAME REQUIRED] — Product owner
- **Exit criterion:** current platform-admin maps to a controlled, email-verified identity and full login/workspace path passes.
- **Known risk to re-check live:** prior inspection found the allowlisted admin identity not email-verified; do not assume that state is unchanged.
- **Rollback/fallback:** no provisioning tightening yet.

### A1.2 Establish second admin
- **Owner:** [NAME REQUIRED] — Product owner
- **Exit criterion:** a separately controlled second admin account exists and its login/admin-workspace path is tested.
- **Rollback/fallback:** none; this is a prerequisite.

### A1.3 Break-glass access
- **Owner:** [NAME REQUIRED] — Ops
- **Exit criterion:** documented recovery path for regaining platform-admin access is tested on a rehearsal branch without weakening normal self-registration.
- **Rollback/fallback:** revert provisioning change.

### A1.4 Tighten verified-email provisioning
- **Owner:** [NAME REQUIRED] — Engineering lead
- **Exit criterion:** only after A1.1–A1.3 pass, platform-admin bootstrap/provisioning requires the intended verified identity condition; both admins still pass login.
- **Rollback/fallback:** redeploy previous build.

## Gate 2 — Database rehearsal on a fresh branch of current production

### A2.1 Fresh production rehearsal branch
- **Owner:** [NAME REQUIRED] — DB owner
- **Exit criterion:** create a new Neon branch from current production head immediately before rehearsal, e.g. `rehearsal-014-YYYYMMDD-HHMM`. Record source branch/head and creation timestamp.
- **Rollback/fallback:** delete rehearsal branch after evidence is preserved.

### A2.2 Duplicate and compatibility checks
- **Owner:** [NAME REQUIRED] — DB owner + engineering lead
- **Exit criterion:**
  - duplicate queries above return no blocking rows or have a reviewed resolution;
  - exact checked-in migration is run using the same runner/transaction handling intended for production;
  - total migration duration and longest lock are measured;
  - row counts for touched pre-existing tables are captured before/after;
  - currently deployed **old build** passes HTTP regression and authenticated synthetic checks against the post-014 rehearsal schema;
  - PR #50 build passes the same checks against the rehearsal schema.
- **Rollback/fallback:** if the old build fails, do not assume code rollback is safe. Treat DB+code as a coordinated maintenance-window release.

### A2.3 Restore point rehearsal
- **Owner:** [NAME REQUIRED] — Ops + DB owner
- **Exit criterion:** create a named restore branch/point on rehearsal, document how post-restore writes would be reconciled, and prove the recovery procedure can be executed.
- **Rollback/fallback:** Gate 2 remains open.

## Gate 2.5 — Phase A close decision
Phase A is closed only when A0, A1 and A2 are all evidenced and no P1/P2 conflict/failure remains.

**PR #50 MUST remain Draft while this gate is open.**

---

# Phase B — Production rollout

> Start only after Phase A is closed and explicitly approved.

## Gate 3 — Migration, deploy, synthetic checks and feature flags

### B3.1 Production migration 014
- **Owner:** [NAME REQUIRED] — DB owner executing; [NAME REQUIRED] watching/verifying
- **Exit criterion:** Part 2 runbook below completes with every post-check passing.
- **Rollback/fallback:** follow the pre-agreed rollback section; never hand-drop new objects.

### B3.2 Deploy PR #50 head
- **Owner:** [NAME REQUIRED] — Engineering lead
- **Exit criterion:** deployment healthy; authenticated production synthetic passes after migration.
- **Rollback/fallback:** feature flags off first; redeploy previous build only if Gate 2 proved post-014 backward compatibility.

### B3.3 Risky features default OFF and independently switchable
- **Owner:** [NAME REQUIRED] — Engineering lead + Ops
- **Required flags:**
  - timed assessments
  - learning write quotas
  - offline outbox/replay
  - integration job execution
  - guardian reporting
- **Exit criterion:** each feature can be enabled/disabled independently per intended scope, with default off for first production rollout.
- **Rollback/fallback:** switch the affected feature off without rolling back unrelated features.

### B3.4 Internal pilot
- **Owner:** [NAME REQUIRED] — Product owner
- **Exit criterion:** one internal **adults-only** classroom runs for one full week with no unresolved P1/P2 defects; incident log reviewed.
- **Rollback/fallback:** flags off; remain adults-only/internal.

### B3.5 Convert PR #50 from Draft
- **Owner:** [NAME REQUIRED] — Engineering lead
- **Exit criterion:** Phase A is closed with evidence and the agreed PR-readiness review is complete.
- **Rollback/fallback:** leave Draft.

---

# Phase C — Parallel workstreams

These do not block each other, but each has its own release gate.

## Gate 4 — Integrations, per tenant and per provider

### C4.1 Google / Microsoft / OneRoster sandbox tenants
- **Owner:** [NAME REQUIRED] — Integrations owner
- **Exit criterion:** recorded contract fixtures; sandbox authorization; read-only/dry-run passes; normalization/reconciliation diff reviewed before writes.
- **Rollback/fallback:** disable provider for that tenant.

### C4.2 First live write test
- **Owner:** [NAME REQUIRED] — Integrations owner
- **Exit criterion:** explicit approval; one test tenant; one controlled write path; success, retry, dead-letter and reconciliation deliberately exercised.
- **Rollback/fallback:** pause job runner and disable provider for tenant.

### C4.3 Tenant BYOK
- **Owner:** [NAME REQUIRED] — Security owner
- **Exit criterion:**
  - tenant key is encrypted at rest or kept in an approved secret manager;
  - application tables store references/metadata, not plaintext secret material;
  - rotation and revocation tested;
  - key never appears in client code, logs, exceptions, integration jobs, audit detail or support exports;
  - platform OpenAI key is never relabeled as tenant BYOK.
- **Rollback/fallback:** revoke/rotate key; tenant AI returns fail-closed.

## Gate 5 — Device / PWA acceptance

### C5.1 Physical matrix
- **Owner:** [NAME REQUIRED] — QA
- **Targets:** desktop Chrome, Android Chrome, iPhone Safari, installed PWA.
- **Exit criterion on every target:** login, assessment, microphone record/replay where applicable, offline outbox, reconnect replay, authenticated reload/cross-device state, and learner export pass.
- **iOS-specific:** explicitly test storage eviction and the absence of dependable background sync.
- **Rollback/fallback:** outbox flag off; online-only learning-write mode.

### C5.2 Idempotency after reconnect
- **Owner:** [NAME REQUIRED] — QA + Engineering
- **Exit criterion:** queued/replayed writes after reconnect do not create duplicate authoritative attempts, assessment attempts, STEAM attempts, progress or evidence.
- **Rollback/fallback:** outbox flag off.

## Gate 6 — Recovery / rollback drill

### C6.1 Restore drill
- **Owner:** [NAME REQUIRED] — Ops
- **Exit criterion:** actual recovery time (RTO) and measured data-loss window (RPO) recorded, not just “restore works.”
- **Rollback/fallback:** remain in pilot; no real-children rollout.

### C6.2 Code rollback drill
- **Owner:** [NAME REQUIRED] — Ops + Engineering
- **Exit criterion:** previous build redeployed against post-014 schema and authenticated synthetic passes; time-to-rollback recorded.
- **Rollback/fallback:** if backward compatibility fails, document coordinated DB+code recovery instead of claiming safe code-only rollback.

## Gate 7 — Curriculum conversion pipeline

### C7.1 Book source → structured LMS
- **Owner:** [NAME REQUIRED] — Curriculum lead
- **Exit criterion:** each converted unit has its own QA gate for objective, answer/rubric, age/language fit, evidence semantics and learner simulation; current coverage labels remain accurate.
- **Rollback/fallback:** unconverted units stay explicitly labeled as source/preview or mapping-in-progress.
- **Engineering rule:** curriculum conversion does not hold up the engineering rollout.

## Gate 8 — Children’s-data compliance before real students

### C8.1 Privacy/compliance review
- **Owner:** [NAME REQUIRED] — qualified reviewer
- **Exit criterion:** written review determines which requirements apply to the actual launch jurisdictions and school model (including COPPA / FERPA / GDPR-K where applicable); school-facing data-processing terms and onboarding responsibilities are ready.
- **Rollback/fallback:** adults-only/internal pilot continues; no real children’s data.

### C8.2 Guardian consent/reporting
- **Owner:** [NAME REQUIRED] — Privacy owner
- **Exit criterion:** guardian-reporting links, consent/revocation, export, retention and deletion-review behavior reviewed against the approved policy/data-processing model.
- **Rollback/fallback:** guardian-reporting flag off.

---

# Part 2 — Production Migration 014 Runbook

## 2.1 Preconditions

Do not begin until all are checked:

- [ ] Gate 0 independent review closed
- [ ] Gate 1 admin identity closed
- [ ] Environment separation proven
- [ ] Change window agreed; no competing deploy/migration
- [ ] Named DB executor present
- [ ] Named watcher/verifier present
- [ ] Abort criteria agreed
- [ ] Feature flags default off
- [ ] Restore/reconciliation communication owner assigned

## 2.2 Static SQL review

Run against the **exact PR #50 file** and attach output:

```bash
grep -n -i "drop\|rename\|alter column\|not null\|truncate\|delete from" db/migrations/014_operational_closeout.sql
grep -n -i "unique\|add constraint\|create index" db/migrations/014_operational_closeout.sql
```

Record:
- [ ] no unexpected destructive statement;
- [ ] every `NOT NULL` addition has safe default/backfill behavior for existing rows;
- [ ] every index/constraint and lock risk listed;
- [ ] both `DO $$` blocks reviewed;
- [ ] re-run behavior understood.

**Current preliminary finding:** additive shape, with partial unique indexes on existing STEAM tables as the main existing-data risk. This finding still needs the named independent/DB-owner review.

## 2.3 Fresh-production rehearsal

1. Create `rehearsal-014-YYYYMMDD-HHMM` from the **current** production branch head.
2. Record:
   - source project/branch;
   - source head;
   - rehearsal branch ID;
   - created-at timestamp.
3. Run both STEAM duplicate queries from A0.3.
4. Capture baseline row counts for every pre-existing table touched by 014:
   - `steam_mission_runs`
   - `steam_attempts`
   - `teacher_learning_progress`
   - `integration_sync_jobs`
5. Run exact migration with the production-intended runner/transaction handling.
6. Record:
   - total duration;
   - longest observed lock/wait;
   - statement that consumed longest time;
   - before/after row counts.
7. Run old deployed build against rehearsal schema:
   - HTTP regression;
   - authenticated learner synthetic;
   - authenticated teacher/partner/admin synthetic.
8. Run PR #50 build against rehearsal schema with same checks.
9. Exercise rollback/restore on rehearsal and record actual timing.
10. Preserve evidence, then delete rehearsal branch.

## 2.4 Production execution

### Step 1 — Confirm database identity
From the same production connection:

```sql
SELECT current_database(), current_user, inet_server_addr();
```

Then independently match the endpoint/branch in Neon to:
- project `royal-queen-79814128`
- branch `br-shiny-meadow-b3ibu54h`

Abort on mismatch.

### Step 2 — Create restore point
Create `pre-014-YYYYMMDD-HHMM` immediately before the run.
Record branch ID, timestamp, source head and retention/PITR window.

Before running, agree who owns reconciliation/communication for writes made after this restore point if a restore becomes necessary.

### Step 3 — Baseline
Record:
- row counts for touched pre-existing tables;
- current affected-column/index/constraint state;
- current deployed commit SHA;
- current error/latency baseline.

### Step 4 — Set safety guards

```sql
SET lock_timeout = '5s';
SET statement_timeout = '120s';
```

Tune from measured rehearsal data. Fail fast rather than blocking learner writes.

### Step 5 — Run exact migration
Run the checked-in migration using the same transaction behavior rehearsed.

Do **not** edit SQL live.

If any statement fails, stop and inspect rollback/post-check state.

### Step 6 — Post-checks
- [ ] all expected tables/columns/constraints/indexes exist;
- [ ] pre-existing table row counts match baseline unless a reviewed statement intentionally changes data;
- [ ] STEAM unique indexes are present/valid;
- [ ] teacher evidence constraint is present;
- [ ] assessment sessions, quotas, integration event/reconciliation, guardian link and lifecycle tables exist;
- [ ] migration tracking recorded if the repository/runtime tracks applied migrations;
- [ ] old deployed build still passes authenticated synthetic.

### Step 7 — Deploy PR #50 head
Keep risky features OFF. Run authenticated synthetic again on the new build.

### Step 8 — Observe
For at least one hour before enabling a risky flag, watch:
- application error rate;
- auth failures;
- DB errors/constraint violations;
- lock waits / slow queries;
- quota 429 rate;
- integration retry/dead-letter events;
- offline outbox replay failures.

## 2.5 Rollback and recovery

| Situation | Action |
| --- | --- |
| Migration fails mid-run | Confirm the runner transaction rolled back; compare post-checks to baseline; investigate only on rehearsal. |
| New build misbehaves after successful migration | Turn risky flags off first. Redeploy previous build only if Gate 2 proved backward compatibility. |
| New code creates bad data | Disable relevant flag; prefer a reviewed forward-fix migration. |
| Corruption/unrecoverable state | Restore from named pre-014 branch/PITR. Apply the pre-agreed plan for post-restore writes and communication. |

**Never manually drop 014 objects as an emergency rollback.** Cleanup belongs in a reviewed follow-up migration.

## 2.6 Abort criteria

Abort before/during production migration when any is true:

- rehearsal reveals duplicates that block a unique index/constraint;
- rehearsal migration duration/lock exceeds agreed threshold;
- current endpoint/branch identity is not `br-shiny-meadow-b3ibu54h`;
- old build fails against post-014 rehearsal schema;
- restore point cannot be created/verified;
- named executor or watcher is unavailable;
- feature flags are not ready/default-off;
- unresolved P1/P2 from Phase A;
- admin identity/break-glass gate is not closed.

## 2.7 Required evidence attached to PR #50

Store under `docs/production/evidence/` and/or link from PR #50:

- named owner register;
- independent authz/IDOR test matrix;
- export/deletion privacy review;
- 014 static SQL review;
- duplicate-check output;
- rehearsal branch ID/source head/timestamps;
- migration duration and lock observations;
- baseline/post row counts;
- old-build post-014 regression result;
- new-build post-014 regression result;
- admin login evidence for primary + secondary admin;
- environment separation audit;
- restore branch name/timestamp;
- restore/rollback drill RTO/RPO;
- physical-device matrix;
- integration sandbox/read-only/dry-run evidence;
- BYOK security review;
- children’s-data compliance sign-off before real students;
- names of executor and verifier.

---

# Production-agent stop rules

Any agent must stop and escalate rather than proceed when:

- asked to convert PR #50 from Draft before Phase A evidence exists;
- asked to apply migration 014 without named executor + watcher + restore point;
- database identity cannot be proven;
- admin identity is not safely recoverable;
- preview/dev can reach production data;
- a destructive migration change appears after this review;
- real child data would be introduced before Gate 8;
- provider/BYOK secrets are not handled through an approved secret boundary;
- a requested action would silently destroy educational records or bypass institutional retention review.

The goal is not to make the checklist green. The goal is to make the production change recoverable, reviewable and safe.
