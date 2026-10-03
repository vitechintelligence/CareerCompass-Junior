# Phase A Export / Deletion Technical Precheck — 2026-09-30

Status: **BUILDER TECHNICAL PRECHECK COMPLETE; INDEPENDENT PRIVACY REVIEW OPEN.**

## Export boundary

`GET /api/account/export` derives the learner from the authenticated active student profile. Its queries are subject-scoped through that profile ID and return an attachment with `Cache-Control: no-store`.

The route does not accept a learner ID supplied by the requester.

## Deletion behavior

The student deletion control creates a `deletion_review` request for the authenticated learner. It does not claim or perform immediate erasure. The UI explicitly states that institution-linked educational records, evidence and retention responsibilities require review.

## Remaining A0.2 acceptance

A named independent reviewer + privacy owner must:
- execute an export with a controlled learner identity;
- compare returned rows to direct subject-scoped DB queries;
- deliberately attempt cross-learner/tenant substitution;
- review institutional retention and backup/PITR implications;
- record the final decision.

No raw learner export should be committed to Git.
