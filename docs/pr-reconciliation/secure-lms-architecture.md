# Secure LMS architecture reconciliation

This branch originally proposed a separate FastAPI/PostgreSQL LMS stack. The production repository has since standardized on the current Next.js + Neon architecture on `main`, including Neon Auth, database-backed books, organization-scoped integration adapters, learning progress, and evidence workflows.

Conflict resolution intentionally keeps the current production stack authoritative. The earlier branch remains useful as an architecture reference for several security principles that should continue to guide implementation:

- organization and class boundaries must be enforced server-side
- student credentials and provider secrets must never be browser-readable
- learning attempts should be idempotent and auditable
- evidence should be attached to concrete learner actions rather than inferred labels
- external integrations must remain organization-scoped
- sensitive observability should use allowlisted metadata only
- migrations must be explicit and tested before production application

Any remaining ideas from the earlier FastAPI proof should be ported into the existing Next.js/Neon runtime rather than introducing a second application server, database schema, or deployment path.
