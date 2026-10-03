# Phase A Break-Glass Rehearsal — 2026-09-30

Status: **TECHNICAL REHEARSAL PASSED; HUMAN OPS SIGN-OFF STILL REQUIRED.**

Neon project: `royal-queen-79814128`  
Non-production branch used: `br-young-thunder-b34n0iem`  
Production branch was not modified.

## Procedure exercised

Within one transaction on the non-production branch:

1. Confirmed the copied active platform-admin profile.
2. Rehearsed role loss by changing that copied profile to `student`.
3. Re-read the profile and confirmed the loss.
4. Restored `platform_admin` using an exact profile ID + exact auth-subject + active-status predicate.
5. Re-read the profile and confirmed `platform_admin` was restored.

The branch ended in its original admin-role state.

## Result

The database-level emergency recovery mechanism is technically viable without weakening normal self-registration.

Remaining A1.3 acceptance:
- named Ops owner;
- named verifier;
- normal sign-in/admin-workspace test through a rehearsal deployment using the recovered identity.

See `docs/production/ADMIN_BREAK_GLASS_RUNBOOK.md`.
