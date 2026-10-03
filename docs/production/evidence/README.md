# Production Go-Live Evidence Index

This directory is the evidence ledger for `docs/production/PRODUCTION_GO_LIVE_GATES.md`.

Do not mark a gate closed merely because CI is green or a builder says it passed.

## Current recovery evidence

- [Fresh production rehearsal and continuation, 2–3 October](20261003-fresh-rehearsal.md): current branch capacity, migrations, admin nominations, rollback-only tests and recovered restore incident. Phase A remains open.

- [2 October privacy implementation and verification](20261002-privacy-recovery.md) and its [machine-readable results](20261002-privacy-recovery.json): Draft PR #54, restored Professor Vi baseline, enforced privacy boundaries, exact tested tree, local/CI/HTTP/QA SQL results and open production dependencies.
- [Phase A closeout checklist](../PHASE_A_CLOSEOUT_20261002.md): required human owners, exit criteria and rollback/fallback for each remaining gate.
- [Implemented architecture and readiness](../../architecture/CCJ_IMPLEMENTED_ARCHITECTURE_20261002.md): actual runtime paths, data and trust boundaries, deployment modes and disconnected targets.

Earlier dated files describe their own tested snapshots. In particular, the missing-privacy-source statement in the 1 October recovery record is historical; PR #54 now supplies the tested continuation from published source. It does not retroactively validate the lost implementation or close Phase A.

## Naming convention

Use dated, descriptive Markdown/text artifacts. Never commit secrets, tokens, cookies, connection strings or learner-identifying raw exports.

Suggested files:

- `YYYYMMDD-owner-register.md`
- `YYYYMMDD-authz-idor-review.md`
- `YYYYMMDD-export-deletion-review.md`
- `YYYYMMDD-migration-014-static-review.md`
- `YYYYMMDD-migration-014-duplicates.txt`
- `YYYYMMDD-migration-014-rehearsal.md`
- `YYYYMMDD-environment-separation.md`
- `YYYYMMDD-admin-identity.md`
- `YYYYMMDD-synthetic-old-build.md`
- `YYYYMMDD-synthetic-pr50.md`
- `YYYYMMDD-restore-rollback-drill.md`
- `YYYYMMDD-device-matrix.md`
- `YYYYMMDD-integration-sandbox.md`
- `YYYYMMDD-byok-security-review.md`
- `YYYYMMDD-childrens-data-signoff.md`

## Evidence rule

An artifact should contain:
- date/time and environment;
- named executor/reviewer;
- branch/commit identifiers;
- exact command/query/test or procedure;
- expected result;
- actual result;
- linked finding/fix if failed;
- final reviewer decision.

Sensitive evidence belongs in an approved private operational system; commit only a non-sensitive summary and a stable reference.
