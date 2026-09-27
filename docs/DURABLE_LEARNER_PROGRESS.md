# Durable Learner Progress — Phase 5

The authenticated Career Compass account is authoritative. Browser state is a convenience only.

## Server hydration

`GET /api/learning/progress` requires:
- an active student profile;
- a published book and unit;
- an exact enrollment ID authorized to that learner/book/context.

It returns server-owned attempt counts, latest save state and unit progress. A foreign enrollment ID fails authorization.

Database-driven activities hydrate this state on load and report:
- Loading saved progress
- Saving
- Saved / synced
- Not saved / could not load — retry

A UI never reports a successful save until the authoritative request succeeds.

## Curriculum denominator

Student dashboard progress includes every published unit in the assigned book. Units with no `book_progress` row contribute 0%. Existing rows no longer define the denominator.

## Shared-device isolation

Enhanced Unit 1 browser markers are namespaced:
- `enrollment:<enrollment UUID>` for authenticated assigned learning;
- a random page-session guest namespace when no enrollment is present.

The sync bridge refuses to promote guest-local markers into an authenticated learner record. Reflections use the same namespace.

The service worker continues to bypass authenticated/workspace/learning routes and does not cache learner data.

## Remaining Phase 5 acceptance

A true Device A -> Device B journey requires an authenticated test learner/enrollment connected to the deployment database. Production currently has no safe synthetic learner journey configured, so this remains an explicit external verification gate.
