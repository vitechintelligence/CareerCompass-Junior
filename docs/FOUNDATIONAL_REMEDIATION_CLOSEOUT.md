# Foundational Remediation Closeout

This document is the handoff for the ordered remediation program represented by
`docs/REMEDIATION_IMPLEMENTATION_MATRIX.md`.

## Current engineering state

The foundational runtime now has regression coverage for:

- server-owned learning correctness and evidence semantics
- active-account, organization, class and enrollment authorization
- versioned activity contracts
- durable server progress and enrollment-scoped offline retries
- duplicate-safe activity, assessment and STEAM writes
- assignment submission, teacher feedback and revision
- assessment rubrics, timed sessions and evidence provenance
- curriculum QA and learner evidence timeline
- consent-gated authenticated guardian reporting
- device/audio/PWA code hardening
- learner data export and deletion-review lifecycle
- learner/organization write quotas
- executable integration job retry/dead-letter/reconciliation runtime
- deployment-environment and production-identity guards
- reproducible Node dependency install with committed lockfile and read-only CI

The full stage gate is:
typecheck, lint, adapter regression, learning correctness, evidence semantics,
authorization, activity contract, progress, idempotency, classroom revision,
evidence/reporting, curriculum QA, device/PWA, operational closeout,
platform-AI spend safety, production build and production HTTP regression.

## Migration 014

`db/migrations/014_operational_closeout.sql` is additive and approval-gated.

The exact checked-in migration was executed as 22 top-level statements in one
transaction on the isolated Neon branch `br-young-thunder-b34n0iem`.
Both dollar-quoted constraint blocks and the STEAM uniqueness indexes were
verified there.

Do not apply migration 014 to the production/default branch
`br-shiny-meadow-b3ibu54h` without explicit production approval.

## Intentionally incomplete / external acceptance

The following are not represented as complete:

1. **Production schema rollout** — migration 014 has not been applied to production.
2. **Admin identity hardening** — the current allowlisted administrator identity was
   observed as not email-verified. Enforcing verified-email bootstrap first would
   risk locking out administration. Verify/remediate the identity, then make the
   grant/revocation path durable.
3. **Live external provider transport** — Google, Microsoft and OneRoster adapters
   have normalization/diagnostics plus an executable job runtime, but no provider
   should be labeled live until real tenant authorization, credentials and end-to-end
   transport have been verified.
4. **Tenant BYOK AI runtime** — tenant AI settings fail closed. Do not route a
   platform key as if it were a tenant BYOK credential.
5. **Physical device acceptance** — desktop Chrome, Android Chrome, iPhone Safari
   and installed-PWA microphone/replay/offline/auth-save journeys still require
   actual devices.
6. **Synthetic production journey and restore rehearsal** — health reports these
   separately and must not mark them verified until actually run.
7. **Curriculum conversion** — some standalone books contain broader source content
   than the structured LMS database. The catalog labels this honestly; remaining
   source lessons must be mapped to real LMS activities before account persistence
   or complete-course claims are added.
8. **Jurisdiction-specific policy/legal decisions** — retention periods, broader
   consent-purpose rules and billing/legal requirements require explicit product/
   institution policy rather than guessed code.

## Release rule

A green preview deployment and green CI prove the code branch is internally
consistent. They do not substitute for the production migration, real provider
authorization, physical-device QA, synthetic production journey or restore drill.
