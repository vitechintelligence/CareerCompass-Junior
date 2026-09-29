# Phase A Independent Review Execution Pack

This document is intentionally written for a reviewer **who did not build PR #50**. It does not replace the owner register or the evidence artifacts.

## 1. Authorization / IDOR matrix

Record the exact identity, role, organization/class, target object, expected result, actual HTTP/result, and evidence reference.

| Test | Identity | Deliberate foreign target | Expected |
| --- | --- | --- | --- |
| Learner enrollment isolation | Learner A | Learner B enrollment ID | deny / no data |
| Learner attempt isolation | Learner A | Learner B enrollment/activity attempt context | deny / no write |
| Assignment isolation | Learner A | Learner B assignment/submission ID | deny / no data |
| Assessment isolation | Learner A | Assessment from class learner is not a member of | deny |
| Export isolation | Learner A | attempt to supply Learner B identity/ID | ignored/deny; export stays A-only |
| Evidence timeline isolation | Learner A | another learner route/ID | deny/no data |
| Guardian report isolation | Guardian A | Learner B ID or Organization B ID | 404/deny |
| Teacher class isolation | Teacher A | unassigned class/submission/assessment | deny |
| Partner tenant isolation | Partner A | Organization B/class B | deny |
| Admin-only surfaces | student/teacher/partner | curriculum QA, teacher-evidence review, platform AI | deny |
| Integration execution | partner A | installation/job from Organization B | deny |

Use **valid existing foreign UUIDs** in the controlled rehearsal dataset; malformed UUID tests are not sufficient.

## 2. Export/privacy comparison

With a controlled learner account:

1. Run `GET /api/account/export`.
2. Confirm `Cache-Control: no-store` and attachment content disposition.
3. Independently query that learner's profile/memberships/enrollments/attempts/submissions/revisions/feedback/assessment attempts/evidence/consent in the rehearsal DB.
4. Compare record counts and identities.
5. Confirm no other learner or tenant appears.
6. Submit a deletion-review request and confirm it is bound to the authenticated profile, not a caller-supplied learner ID.
7. Confirm product copy says **review request**, not immediate deletion.
8. Record backup/PITR and institutional-retention implications.

Do not commit the raw learner export.

## 3. Environment separation audit

Record only non-secret identity metadata.

| Environment | VERCEL_ENV | NEON_PROJECT_ID | NEON_BRANCH_ID | DB endpoint ID | Auth endpoint ID | App origin | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Production | production | expected project | `br-shiny-meadow-b3ibu54h` | production endpoint | same | canonical origin | required |
| Preview | preview | expected project | non-production | non-production | same preview branch | preview URL | must not equal prod |
| Development | development | expected project | non-production/local | non-production/local | same intended branch | localhost/dev | must not equal prod |

Current production endpoint identity: `ep-damp-bonus-b300sxd5`.

The runtime will fail closed if Preview/Development uses the known production branch or endpoint, but Vercel scope values still need a human audit.

## 4. Admin identity

A1 is closed only after all are demonstrated:

- current controlled admin email is verified;
- current admin sign-in and `/workspace/admin` work;
- a second separately controlled admin exists and passes the same path;
- break-glass recovery is rehearsed and normal sign-in after recovery works;
- then set `CCJ_REQUIRE_VERIFIED_PLATFORM_ADMIN=true` and retest both admins.

Do not enable that switch before both controlled accounts are ready.

## 5. Rollout flags

All are default OFF unless the value is exactly `true`:

- `CCJ_FEATURE_TIMED_ASSESSMENTS`
- `CCJ_FEATURE_LEARNING_WRITE_QUOTAS`
- `CCJ_FEATURE_OFFLINE_OUTBOX`
- `CCJ_FEATURE_INTEGRATION_JOB_EXECUTION`
- `CCJ_FEATURE_GUARDIAN_REPORTING`

The reviewer should verify each can be toggled independently in a non-production deployment before Phase B.

## 6. Phase A close statement

The independent reviewer signs only when:
- Gate 0 evidence is complete;
- Gate 1 evidence is complete;
- Gate 2 fresh-production rehearsal + restore evidence is complete;
- no unresolved P1/P2 exists.

PR #50 remains Draft until that signature exists.
