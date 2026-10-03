# Fresh production rehearsal and continuation — 2–3 October 2026

**Phase A remains OPEN. PR #50 stays Draft.** Executor: Codex (builder); independent reviewer and named operational owners remain required. This record supersedes the branch-capacity and missing-second-admin-nomination statements in the earlier 2 October evidence. It does not close authenticated acceptance or authorize production rollout.

## Fresh branch and migration results

With the owner's explicit cleanup authorization, obsolete temporary migration branches `br-plain-recipe-b3eg3tf6` and `br-winter-queen-b3cza2lv` were removed after checking branch flags, children, recorded usage, application backends and changes since their forks. Production, Vercel development and the established QA/014 validation branches were retained. The first delete returned an authentication error despite succeeding; inventory readback confirmed deletion before proceeding.

Fresh rehearsal branch: `br-summer-truth-b3lle42u`, `ccj-phase-a-fresh-rehearsal-20261002`, created `2026-10-02T09:21:53Z` from production `br-shiny-meadow-b3ibu54h`, parent LSN `0/2D95EB0`, parent timestamp `2026-10-02T09:21:41Z`. Rehearsal compute: `ep-lively-glade-b36ygurl`. All operations used explicit project `royal-queen-79814128` and branch IDs.

| Checked-in migration | SHA-256 | Statements | First server DDL time | Repeat server DDL time |
|---|---|---:|---:|---:|
| 014_operational_closeout.sql | e26dce8186e843c70b4b4347bb6a9689f164f3018c0c15e528f13624056b346e | 22 | 127.378 ms | 4.203 ms |
| 015_professor_vi_report_cards.sql | 2a64a0e141b94428acba2e0a8302c630bb93879ff68860a1b704769b61a9e209 | 23 | 86.410 ms | 4.834 ms |
| 016_privacy_governance.sql | 7d6e03e024bae20b28f927b8c5710fc003cf129b5d052a93d66040d9eb010b4f | 10 | 54.922 ms | 1.991 ms |

All three applied and repeated successfully on this fresh clone. The runner preserves dollar-quoted constraint blocks, hashes the exact source, uses one outer transaction, a 5-second lock timeout and a 60-second statement timeout. Migration 016's standalone BEGIN/COMMIT is replaced by that outer transaction. An initial attempt to execute its BEGIN inside a DO block failed before DDL; the runner was corrected and regression-tested before the successful run. An initial repeat command misspelled the 015 filename; the subsequent complete repeat used the exact files above.

Preflight returned zero duplicate groups. Existing profiles (5), organizations (2) and touched-table row counts were preserved. Production STEAM runs/attempts, teacher progress, integration jobs and organization data-policy tables were empty at the fork. Therefore this is real-production-data rehearsal with **empty STEAM tables**, not a populated STEAM workload benchmark. Seven rollback-only PostgreSQL assertions separately proved legacy inserts, unique active context, distinct tenant contexts, duplicate submission rejection, new-field persistence and completed-history behavior. No synthetic profile, organization or mission remained.

Twenty-eight privacy PostgreSQL assertions also passed on this migrated branch, with no fixture profiles/organizations left behind. Migration 014 is additive in shape; 015 additionally drops/replaces the AI-mode CHECK with a wider accepted set. Do not describe all three files as exclusively additive DDL. Held lock modes were observed, including AccessExclusive; actual lock-hold duration was **not** measured. Old deployed/new authenticated build compatibility remains open.

## Restore incident — recovered, independent review still required

The available production snapshot was `snap-orange-meadow-b3du3v0y`, created `2026-09-30T20:31:42Z`, expiry `2026-10-08T00:00:00Z`. A fresh snapshot request failed because the account permits one snapshot. The existing restore point was retained.

The builder incorrectly used `restore_snapshot` with a new name, omitted `target_branch_id`, and set `finalize:true`, expecting an isolated restore. Finalization instead swapped production name/default status and moved production endpoint `ep-damp-bonus-b300sxd5` to restored branch `br-wild-resonance-b3q2nhcm`. **This was an unintended production routing change, not an accepted rehearsal.**

Observed routing interval: `2026-10-02T09:38:06Z`–`09:39:22Z` (76 seconds). The untouched original branch was retained. Recovery restored its default/primary flag and name, removed only the new replacement compute `ep-cold-salad-b370sjih` created by the restore, and moved the original endpoint back to `br-shiny-meadow-b3ibu54h`. Readback confirmed the original endpoint binding, Auth base URL and canonical trusted origin. Canonical `/api/health` returned HTTP 200 with core/extended schema ready. Subsequent continuation readback again confirmed the original production binding and default/primary status.

After recovery, fingerprints and counts for all 72 existing public tables matched both the fresh pre-migration clone and the restored snapshot. No public-table differences were observed. This does **not** prove zero authentication/session disruption, zero failed requests, or a measured end-to-end RTO/RPO. Authentication-schema history and request logs were not reconciled. The restored copy remains isolated with read-only compute `ep-old-bar-b3g3x3wm`; no further restore/finalization should be attempted without review.

Prevention added to `scripts/sql-migration-contract.cjs`: an explicit disposable non-production target is required; restore request generation fixes `finalize:false`; production identity must match before a drill; post-operation checks reject changed production flags/names, moved endpoint bindings, finalized copies and a restore targeting the production source. These helpers are tested safeguards for the documented workflow, not a claim that direct provider tools can no longer be misused. Production restore/finalization requires the existing human approval/watcher gate.

## Admin and test school

Owner-nominated primary: `labellesolutionservices@gmail.com`; second: `vichung196@gmail.com`. Both identities already exist and had password accounts, but both provider `emailVerified` values were false when checked. The primary retained active platform-admin access; the second retained active partner-admin membership in Giong Chuan Global, with its existing class. No verification boolean or authentication session was fabricated. No production role grant was made.

The deployment example now lists both nominated emails. Actual Vercel allowlist configuration remains unverified. Verified-email tightening must remain off until both controlled login/recovery paths pass. The grant implementation now binds the authenticated subject, locks the profile, and atomically writes the role change plus `admin_audit_events`; retries do not duplicate grants. Five actual PostgreSQL assertions on the rehearsal branch passed: wrong subject denied, one grant/audit, retry deduplication, partner membership preserved, and role change rolled back when audit insertion fails. All fixture records were rolled back. This is SQL/module evidence, not a real authenticated login.

## Remaining environment dependencies

- The connected ViTech3 Vercel account could list its team but could not access the canonical deployment/project. The other account exposed a different CCJ project (`career-compass-junior.vercel.app`), not the canonical `career-compass-junior-vitech.vercel.app`; its configuration was not changed. Correct project authorization is required to inspect actual Production/Preview/Development secrets. No chat authorization prompt was available from the exposed Vercel tools.
- Canonical health reported matching database/Auth endpoint identities, but undeclared project/branch identity variables. Those deployment settings need verification/correction with proper project access.
- Rehearsal Auth provisioning returned HTTP 409 because the copied `neon_auth` schema already exists. That schema was not dropped. Provider-supported branch Auth setup is needed for authenticated old/new build and Giong Chuan journeys.
- Real account-owner email verification and login, independent cross-role/tenant review, restore incident review, lock-duration measurement and named owner acceptance remain open. Real children's onboarding remains gated by the separate privacy acceptance requirements.

## Verification scope

Earlier continuation ran all 17 automated suites, production build, 223 learning evaluation HTTP requests over 31 objective activities, and 14 anonymous/environment-boundary HTTP checks. The latest admin-grant change requires its own final build and test record; do not treat earlier results as testing that later change. A resumed local build encountered sandbox `EPERM` when launching TypeScript, and its HTTP follow-up could not start the server. Those attempts are failures, not passing evidence. The continuation runs direct in-process tests and requests the authorized build outside that process sandbox; final results are recorded alongside this file when available.

Rollback: retain drafts and feature flags off; revert the reviewed application change if needed; preserve the original production branch and existing restore point. Never use snapshot finalization as cleanup or as a substitute for independent acceptance.

## Final local verification — 3 October continuation

Application commit published as `d599484839f3915d688fe30cb3dde8bba277260f`, exact tree `2df1ad54d99deffc5e6c7cd840661d07ffc4645b` (local commit `4e502e9`). Typecheck, lint (zero errors, four existing image warnings), production build, all 17 non-HTTP test commands and both HTTP checks passed after running with working child-process support. Results include 185 unit tests, 13 adapter profiles, 223 learning evaluation requests for 31 activities, and 14 anonymous/environment-boundary requests. [Machine-readable verification](20261003-verification.json). The earlier sandbox attempts are excluded. Remote CI and authenticated acceptance are separate gates; local success does not imply production deployment.
