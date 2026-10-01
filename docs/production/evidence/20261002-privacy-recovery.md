# Privacy implementation recovery and verification — 2 October 2026, Vietnam time

**Result: implementation restored and published for review; Phase A OPEN; production rollout NO-GO.** No production migration, code promotion or real-children pilot was performed. The exact canonical origin was added to production Neon Auth trusted domains and verified by readback; that reversible prerequisite repair is not proof of successful login.

Executor: Codex, lead implementation engineer/builder. Independent reviewer and accountable human owners: **not yet nominated**. This is builder evidence, not independent approval. The existing [production gate](../PRODUCTION_GO_LIVE_GATES.md) requires a named owner for every gate and says PR #50 must remain Draft until Phase A closes.

## Published source and exact tested identity

Repository: `vitechintelligence/CareerCompass-Junior`.

- Existing published Professor Vi/report-card baseline: `6d8f11425c1b4233cfcd231e912146700a11ce28` (PR #51).
- Recovery: [Draft PR #54](https://github.com/vitechintelligence/CareerCompass-Junior/pull/54), branch `fix/ccj-privacy-governance-20261002`, stacked on that baseline.
- Tested application commit on GitHub: `7019cda008f2f3c4d0c7ee445ff4fe44676a735d`.
- Equivalent local commit: `88a3edf3f401ad53fe02555572f73e717cb7f118`.
- Exact shared tree: `b44298b3fa45f4bf7f5bba5ff902d8cc7ba9f31c`; publishing checked tree equality before updating the branch.
- Four focused commits preserve the baseline and add recovered Phase A boundaries, backend governance, bilingual notices/family workflows, then tests and architecture/closeout records. This evidence addition changes documentation only.
- PR #53 contains an overlapping earlier Phase A subset; reconcile the stack before merging. PR #52 was a documentation checkpoint, not a recoverable source backup. No LTI development branch was silently merged into this stack.

## Commands and observed results

Local Node: `v24.19.0`. Next.js: `16.3.5`. CI application Node: `v20.19.0` (verified in the job log, independently of the Actions runner's own Node version).

| Command/check | Actual result |
|---|---|
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0; 0 errors, 4 existing `no-img-element` warnings |
| `npm run build` | Exit 0; optimized production build produced |
| `npm run test:adapters` | Exit 0; custom self-test covering 13 provider profiles; not a live integration |
| `npm run test:learning` | 37 passed, 0 failed |
| `npm run test:evidence` | 8 passed, 0 failed |
| `npm run test:authorization` | 5 passed, 0 failed |
| `npm run test:platform-ai` | 6 passed, 0 failed |
| `npm run test:activity-contract` | 7 passed, 0 failed |
| `npm run test:progress` | 3 passed, 0 failed |
| `npm run test:idempotency` | 3 passed, 0 failed |
| `npm run test:classroom` | 3 passed, 0 failed |
| `npm run test:evidence-reporting` | 4 passed, 0 failed |
| `npm run test:curriculum-qa` | 3 passed, 0 failed |
| `npm run test:device` | 6 passed, 0 failed; no physical iOS test |
| `npm run test:operations` | 23 passed, 0 failed |
| `npm run test:phase-a-additions` | 7 passed, 0 failed |
| `npm run test:phase-a` | 23 passed, 0 failed |
| `npm run test:privacy` | 33 passed, 0 failed |
| `npm run test:learning:http` | Exit 0; 31 objective activities, 223 evaluation requests; served-book/reload and teen route retained; 0 learner DB writes |
| `npm run test:phase-a:http` | Exit 0; 14 requests; public notices/signup gate; anonymous AI/export denial; guardian flag-off denial; synthetic preview-production Auth/DB reuse denied; 0 application DB writes |

All sixteen non-HTTP suites passed: **171 TAP tests plus the adapter self-test**. The privacy tests execute actual modules with controlled session/database/network doubles; they do not prove a real signed-in browser workflow. HTTP tests run `next start` against the production build with synthetic/no credentials. They are not checks against the live production site.

[GitHub CI run 36913079952](https://github.com/vitechintelligence/CareerCompass-Junior/actions/runs/36913079952), job `110540291318`, tested the published application commit and completed successfully at `2026-10-01T19:18:38Z`. Step readback and decoded logs confirmed dependency installation, typecheck, lint, all sixteen suites, production build and both HTTP checks passed. CI repeated the same test counts and HTTP outcomes above. Its warnings do not represent a completed dependency/security audit.

Both GitHub Vercel status contexts reported successful **preview** deployment for this commit:

- `career-compass-junior`: deployment `36HnTpGoqjn8xbXZb8yz25k1qPMr`.
- `career-compass-junior-qc56`: deployment `tnRZnbC5ohTtc48M5WtT41v7jDtE`.

This is status evidence only. Readback of the known deployment in scope `vitech3` with the two connected Vercel accounts returned **403 unauthorized scope** and **404 deployment not found**. Actual preview configuration, secret scopes, runtime health and authenticated journeys remain unverified. No browser fallback or secret mutation was performed.

## Actual PostgreSQL exercise and infrastructure limits

Project: `royal-queen-79814128`. Non-production QA branch: `br-polished-snow-b337xdoy`, created from an older production snapshot on 27 September. Migration 016 ran as ten additive table/index statements in a transaction on this QA branch only. It does not establish that 014–016 run safely on fresh current production data; 014/015 are absent on this branch and full application governance readiness therefore remains false.

Procedure: `node scripts/privacy-postgres-fixture.cjs` generates synthetic SQL from consent/access/pilot queries captured from the real source modules. The fixture uses an exception-rolled-back subtransaction, protects against existing fixture-ID collisions, and returns assertion counts plus remaining synthetic row counts. Its statements were executed on the explicitly identified QA branch. **28 assertions passed; remaining synthetic profiles = 0; remaining synthetic organizations = 0.** Consent rows, agreement rows, authority records, classes, membership and pilot scope fixtures were rolled back with the same subtransaction. No Auth identities were created. The tests include separate learner/representative signatures, withdrawal and renewed decisions, revoked/expired/stale/foreign scope denial, independent-review constraints, unsupported private-deployment approval denial and expiring tenant/class pilot scope.

| Tested input | SHA-256 |
|---|---|
| `db/migrations/016_privacy_governance.sql` | `7d6e03e024bae20b28f927b8c5710fc003cf129b5d052a93d66040d9eb010b4f` |
| `scripts/privacy-postgres-fixture.cjs` | `727f5a2ac0c91a82216b9ae47ff3478a4a3695ba642b22e6a28e1d10ba62771e` |
| Generated rollback-only SQL | `950716a210e3389ca613d3e646313fc60c748c583dfb96d747d32e837bddbd76` |

Production branch `br-shiny-meadow-b3ibu54h` was inspected read-only: 0 active-context uniqueness violations, 0 duplicate submission-ID groups, 0 null-tenant logical duplicate groups. Migration 014/016 tables were absent at observation. These counts do not prove lock duration, backfill behavior or old/new build compatibility.

Fresh clone request `ccj-phase-a-rehearsal-20261001-restored` failed with `422 brancheslimitexceeded` (ten branches). No existing branch was deleted or reset. The branch deletion tool explicitly requires user authorization; no destructive cleanup was authorized. A QA snapshot request failed with `400 not allowed to snapshot non-root branch`.

Production restore reference: `snap-orange-meadow-b3du3v0y` / `ccj-pre-remediation-20261001`, created `2026-09-30T20:31:42Z`, expires `2026-10-08T00:00:00Z`. It must be refreshed/validated before a later rollout. Recovery time and data loss have not been measured.

Production identity observation: 1 active platform administrator, 0 verified active administrators. The primary controlled mailbox remains unverified; no verification field was forced in SQL and no second identity was invented. Keep `CCJ_REQUIRE_VERIFIED_PLATFORM_ADMIN=false` until both controlled administrators independently pass verification, login/recovery/logout and access tests.

## Remaining gates and required environments

| Unverified requirement | Why / required dependency | Acceptance evidence required |
|---|---|---|
| Fresh 014–016 rehearsal and compatibility | A free branch slot or increased quota; DB owner and watcher | Fresh current production clone; migrations; uniqueness/row/lock checks; current deployed and recovered builds' scoped reads/writes |
| Two-admin login/recovery | Primary mailbox owner, nominated second controlled adult email, usable canonical-site sessions | Provider email verification, independent real login/recovery/logout and role access |
| Actual Vercel isolation | Account authorized for the `vitech3` projects | Preview DB/Auth/credential scopes, negative live runtime tests and independent review |
| Authenticated multi-role/multi-tenant journeys | Controlled QA Auth accounts plus isolated 014/015/016 deployment | Learner/representative/teacher/partner/admin ID substitution; consent and withdrawal readback; progress/attempt/revision/evidence rows |
| Vietnamese school processing | Named privacy/security/release owners, school signatory and qualified independent reviewer | Signed responsibilities and age/authority/rights/incident review; actual countries, processors, retention and required assessment evidence |
| Real devices and recovery | Physical target iOS devices, controlled classroom accounts, isolated restore target | Storage eviction/audio/reconnect and replay checks; measured recovery time/loss and rights/consent reconciliation |
| Swoosh/Halibut/Capsule/LTI/BYOK | Approved endpoints, contracts, identity/key custody and institution acceptance | Tenant-bound authenticated schema exchange, minimized context, provider/custody/rotation tests and real sandbox outcomes |

Swoosh, Halibut OS and Intelligence Capsule remain **disconnected**. Their target responsibilities and classification rules are documented, and unsupported paths fail closed; a diagram or flag is not a functioning integration. Professor Vi direct remote learner AI remains blocked in production by the recovered runtime guard. Public curriculum and deterministic report-card drafts do not depend on a live model. Rights review is not complete provider/Auth/backup erasure.

Use the [owner/exit/rollback checklist](../PHASE_A_CLOSEOUT_20261002.md) and [architecture matrices](../../architecture/CCJ_IMPLEMENTED_ARCHITECTURE_20261002.md) for the concrete remaining work. PR #50 stays Draft. Final independent reviewer decision: **pending; no production approval claimed**.
