# Phase A implementation recovery — 2026-10-01

**Historical checkpoint:** the privacy implementation was subsequently restored as a tested continuation on the published Professor Vi baseline in [Draft PR #54](https://github.com/vitechintelligence/CareerCompass-Junior/pull/54). See [2 October evidence](20261002-privacy-recovery.md) for current results and remaining gates. The statements below refer to this earlier patch only.

**Status: technical preparation published for review; Phase A OPEN; production rollout BLOCKED.** PR #50 must remain Draft. This patch does not implement or restore the later unpublished privacy/governance work described in Draft PR #52.

## Source recovered

- Remote baseline: PR #50 head `e87bd8356af49093c4cdc4d5b73e54efb906ba0f`, tree `4cda69b30ee788b99893233002efa6a8724b93d8`.
- Surviving local implementation: commit `5cef36431c76a0c7c7cb31189afb160b68298773` (16 files). Those source files were preserved, rather than recreating the application or changing its architecture.
- Added a production HTTP boundary regression and CI step, plus this verification record.
- The execution workspace reconnected to an older snapshot. `/workspace/scratch/30583c911434/ccj-privacy-school` and its later uncommitted implementation are absent. The earlier checkpoint document survives in GitHub, but is not a source-code backup. Its prior 44 privacy/governance assertions cannot be rerun against this recovered patch.

## Fixes in this patch

| Boundary | Enforced behavior | Rollback |
| --- | --- | --- |
| Neon Auth and database runtime | Preview, development, and test reject the known production branch or endpoint. Auth configuration is checked before reusing a cached client. | Revert this patch only after ensuring non-production credentials cannot reach production; leave production secrets out of preview. |
| Learner export | Active student identity required; foreign learner/tenant request parameters do not select the subject; responses are not cached; a default-off server flag permits controlled acceptance testing. | Disable `CCJ_FEATURE_LEARNER_DATA_EXPORT`. |
| Deletion review | Session-bound review request, default-off server flag; no promise or implementation of immediate erasure. | Disable `CCJ_FEATURE_DELETION_REVIEW`; retain submitted requests for institutional review. |
| STEAM reflection | Recheck active institution and class membership before mutation and within the final update; reject revoked scope without changing the run. | Revert the application patch if needed; preserve historical evidence. |
| Guardian evidence | Active student and institution membership required; show only shareable, reviewed, demonstrated/verified evidence. | Disable `CCJ_FEATURE_GUARDIAN_REPORTING`; retain links and evidence. |

These changes do not establish verified representative authority, current-version family consent, signed school processing agreements, localized hosting, Swoosh transport, Halibut orchestration, or Capsule custody. Those capabilities remain unimplemented in this patch.

## Commands actually executed

Executor: Codex, the builder. Independent human review has **not** occurred. Local runtime: Node `24.19.0`, Next.js `16.3.5`, TypeScript `5.9.3`. CI uses Node `20.19.0` and must be observed separately.

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed: 0 errors, 4 existing image warnings. |
| `npm run build` | Passed. The first attempt hit an invalid restored dependency symlink; the same installed dependencies were copied into the existing project root and the build was rerun successfully. No application config was changed to bypass this error. |
| Existing suites: learning, evidence, authorization, activity-contract, progress, idempotency, classroom, evidence-reporting, curriculum-qa, device, operations, adapters, platform-ai | All 13 passed. |
| `npm run test:phase-a` | 23 passed, 0 failed; exercises actual modules with mocked session/provider boundaries. |
| `npm run test:learning:http` | Passed against the production server: 31 objectives, 223 evaluation requests; existing junior/teen book routes and media recorder compatibility preserved. No learning database writes. |
| `npm run test:phase-a:http` | Passed against the production server: 5 requests; anonymous export rejected, guardian flag-off access blocked, synthetic preview-to-production Auth and DB reuse rejected. No application database writes. |
| SQL boundary fixtures | All 21 returned the expected counts on existing non-production branch `br-polished-snow-b337xdoy` in project `royal-queen-79814128`. CTE fixtures shadow all referenced tables and use synthetic rows; no application rows were read or changed. |

The SQL fixture result is stored alongside this record. It tests the checked-in queries' filtering behavior, not authenticated browser sessions or durable end-to-end persistence. The existing branch is not a fresh production clone and cannot satisfy the migration rehearsal gate.

## Unverified work and dependencies

| Required work | Why not verified here | Required environment / owner | Exit criterion | Rollback / fallback |
| --- | --- | --- | --- | --- |
| Later privacy implementation | Uncommitted source absent after workspace restore. | Original working-tree backup or an explicitly identified continuation from published source. | Retrieve exact source, rerun its checks, and publish it before making capability claims. | Keep the affected pathways disabled; PR #52 remains a documentation checkpoint. |
| Authenticated cross-role/tenant journeys and resulting records | No controlled test-account credentials or independently reviewed session matrix available. | Isolated deployment with learner, guardian, teacher, partner and both admin accounts; independent reviewer. | Run substituted-ID attacks and compare real saved/exported rows to the intended subject/scope. | Keep PR #50 Draft and risky flags off. |
| Fresh-production 014 rehearsal and old/new build compatibility | Neon still lists 10 branches; fresh branch creation was previously rejected for capacity. No branch deleted or reset here. | DB owner, watcher, one available branch slot, fresh clone of current production. | Run the exact migration, uniqueness checks, row-count and lock measurements, then both builds' authenticated synthetics. | Do not apply 014 to production. |
| Admin identity and second admin | Verification and real login depend on controlled human identities. | Primary owner completing verified-email flow, a separately controlled second admin, rehearsal deployment. | Both complete the intended login/admin path and recovery is demonstrated. | Leave verified-email provisioning tightening off until this gate closes. |
| Live environment separation | Synthetic runtime guards do not prove Vercel's actual secret scopes. | Operations/security access to the correct Vercel project and preview/production configuration. | Verify branch-bound Auth/DB values and independently inspect secret scopes. | Remove production credentials from preview; rotate any exposed credentials. |
| Restore and device drills | No actual restore or physical iOS acceptance in this run. | DB/operations owners and physical iPhone/PWA plus other target devices. | Measure RTO/RPO; exercise eviction, reconnect replay and media behavior. | Keep offline outbox off and remain in internal pilot. |
| School privacy and child-data processing | Signed agreements, verified authorities, actual country/provider inventory and the missing server enforcement are not in this patch. | Privacy owner and institution signatories, reviewed processing documents, tested runtime controls. | Complete written review and enforce approved age/consent/retention policies. | No real-children rollout. |
| Governed intelligence/integrations | No connected Swoosh/Halibut/Capsule exchange in this patch. | Verified native transport/authorization contracts, orchestration service and institution-controlled custody deployments. | Prove authenticated, schema-controlled, tenant-bound exchange, audit and degraded behavior. | Keep remote learner AI and unapproved connector writes disabled. |

Human owners remain unassigned; this record does not fill the mandatory owner register or self-certify production approval. The pre-remediation snapshot recorded in PR #52 expires `2026-10-08T00:00:00Z`; it is not an RTO/RPO measurement.
