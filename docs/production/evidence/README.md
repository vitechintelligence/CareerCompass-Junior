# Production Go-Live Evidence Index

This directory is the evidence ledger for `docs/production/PRODUCTION_GO_LIVE_GATES.md`.

Do not mark a gate closed merely because CI is green or a builder says it passed.

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
