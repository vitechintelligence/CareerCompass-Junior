# Unit 1 interactive reconciliation

This branch originally implemented a standalone Unit 1 learner experience. The production application has since moved forward to the shared Next.js + Neon interactive-book runtime on `main`.

Conflict resolution intentionally keeps the current production architecture authoritative rather than reintroducing parallel lesson-state, landing-page, or local-only progress systems.

The useful product ideas from the earlier Unit 1 work remain valid design guidance for the current runtime:

- bilingual learner navigation
- Look · Listen · Say vocabulary interactions
- browser pronunciation playback
- speaking models and rhythm practice
- retry-friendly checks
- private speaking practice with temporary browser audio
- reflection and visible learner progress

Future Unit 1 expansion should implement these capabilities through the existing database-backed book/activity runtime, progress API, and learning-capsule evidence layer instead of a second standalone lesson engine.
