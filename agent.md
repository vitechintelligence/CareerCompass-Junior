# agent.md — Career Compass Junior Agent Communication

This file is the shared operating contract and handoff point for any AI agent, developer, or automation working in this repository.

Read this file before changing code, infrastructure, authentication, database configuration, deployment settings, or production behavior.

## 1. Project identity

Repository:

`vitechintelligence/CareerCompass-Junior`

Product:

`Career Compass Junior Mastery`

Canonical production origin:

`https://career-compass-junior-vitech.vercel.app`

Legacy production host:

`https://career-compass-junior-lake.vercel.app`

The legacy host must redirect to the canonical ViTech origin. Do not generate auth callbacks, password-reset links, metadata, or production navigation for the legacy host.

## 2. Correct Neon project

The production Career Compass LMS database/auth project is:

- Neon project name: `Career Compass LMS`
- Neon project ID: `royal-queen-79814128`

This project ID is authoritative.

Do **not** use `little-shadow-12194945` for Career Compass Junior production work. That project was previously confused with this application and must not be treated as the production Career Compass LMS project.

Before making any Neon change:

1. Resolve the target branch from project `royal-queen-79814128`.
2. Verify the branch is the intended production/default branch.
3. Verify `DATABASE_URL` and `NEON_AUTH_BASE_URL` point to the same intended Neon project/branch.
4. Never infer a Neon project from its display name alone.

## 3. Production auth contract

Authentication uses Neon Managed Better Auth through `@neondatabase/auth`.

Production auth must be deterministic:

- Sign-in, password recovery, and password reset should use the server-side Neon Auth boundary.
- Production reset/callback URLs must use `https://career-compass-junior-vitech.vercel.app`.
- The same exact HTTPS origin must exist in the Neon Auth trusted-domain allowlist.
- Do not weaken trusted domains with a broad `https://*.vercel.app` wildcard for production.
- Never log passwords, reset tokens, session secrets, auth cookies, or private learner data.
- Safe logs may include operation name, HTTP status, and non-sensitive error code only.
- Do not reveal whether a recovery email exists in the user directory.

Important environment variables:

```
DATABASE_URL
NEON_AUTH_BASE_URL
NEON_AUTH_COOKIE_SECRET
NEXT_PUBLIC_APP_URL
```

Production `DATABASE_URL` and `NEON_AUTH_BASE_URL` must be checked together whenever auth or database behavior is being debugged.

## 4. Canonical production origin

Production is pinned to:

`https://career-compass-junior-vitech.vercel.app`

Code that generates absolute production URLs must use the canonical site configuration rather than arbitrary request hosts or stale deployment aliases.

Local development may use localhost.

## 5. Roles and access model

Primary roles:

- `platform_admin`
- `partner_admin`
- `teacher`
- `student`

Self-registration must not allow users to promote themselves into staff, partner, or platform-admin roles.

The platform administrator bootstrap allowlist currently includes:

`labellesolutionservices@gmail.com`

Role routing should converge through `/workspace` and then route to the appropriate protected workspace.

## 6. Important application routes

```
/auth/sign-in
/auth/sign-up
/auth/forgot-password
/auth/reset-password
/auth/session-ready

/workspace
/workspace/admin
/workspace/partner
/workspace/teacher
/workspace/student

/books
/international
/vn
/learn/[bookCode]
/learn/[bookCode]/[unitCode]
```

Do not create a parallel portal or second LMS implementation when an existing route/model can be extended.

## 7. Data and privacy rules

Career Compass Junior serves K-12 learners. Treat learner data as sensitive.

Rules:

- Minimize personal data.
- Do not expose learner information across organizations/classes.
- Do not upload voice recordings unless a feature explicitly requires it and the privacy model has been approved.
- Existing speaking/recording experiences should remain ephemeral/browser-local unless intentionally redesigned.
- Use `learning_capsules` for approved learner evidence/metadata rather than inventing another evidence store.
- Avoid storing secrets or private credentials in Git.

## 8. Database workflow

Core schema:

`db/schema.sql`

Additive migrations:

`db/migrations/`

Curriculum seed:

`db/seed.sql`

Before a production database change:

1. Inspect the existing schema and migrations.
2. Confirm the correct Neon project: `royal-queen-79814128`.
3. Prefer additive migrations.
4. Do not perform destructive SQL without explicit approval.
5. Keep code and migration assumptions synchronized.
6. Verify optional tables before making an entire portal depend on them.

Admin pages should degrade gracefully when optional integrations/features are unavailable. Avoid one giant query dependency where one optional missing table can crash the entire workspace.

## 9. Engineering and deployment workflow

`main` must remain deployable.

Normal workflow:

1. Inspect the current `main` branch and recent commits.
2. Create a focused feature/fix branch.
3. Make the smallest coherent change.
4. Run/observe TypeScript typecheck, lint, integration self-test, and production build.
5. Verify Vercel preview.
6. Open a focused PR.
7. Merge only when required checks are green.
8. Verify the final production Vercel deployment after merge.

Do not claim a change is live while the production deployment is still pending.

## 10. Do not duplicate architecture

Before building something new, inspect:

- `README.md`
- `docs/`
- existing routes under `app/`
- auth helpers under `lib/auth/`
- database models/migrations
- current workspace implementation

Prefer extending the existing Career Compass Junior system rather than introducing a parallel database, auth system, portal, LMS, progress engine, or curriculum engine.

## 11. Agent communication protocol

Every agent/developer should leave a concise handoff when completing substantial work.

Use this format in PR descriptions, comments, or the final development update:

```
STATUS:
- What changed:
- Branch / PR:
- Commit:
- Validation:
- Production deploy:
- Database/Auth changes:
- Remaining issue:
- Next recommended step:
```

For unresolved infrastructure issues, record exact identifiers when known:

```
Neon project ID:
Neon branch ID:
Vercel project:
Canonical origin:
Relevant environment variable names:
```

Never record secret values.

## 12. Current auth history / known decisions

Recent production hardening established these rules:

- File-level `"use server"` modules must not export non-async runtime constants.
- Sign-in uses a server action.
- Password-reset request and reset completion use the server-side auth boundary.
- Recovery states are explicit rather than ambiguous client-only failures.
- Production auth links use the canonical ViTech origin.
- The old `career-compass-junior-lake.vercel.app` host is legacy.
- Correct Career Compass LMS Neon project is `royal-queen-79814128`.

If observed production behavior conflicts with this file, verify the deployed environment and infrastructure configuration before rewriting working application logic.

## 13. Current product direction

Career Compass Junior combines:

- Career discovery
- Mastery English
- Future skills
- interactive books/modules
- teacher/class workflows
- partner/institution workflows
- learner progress/evidence
- VinaSkillTrust Junior industry exposure

The platform should be institution-ready for Vietnam and broader ASEAN use while remaining usable by individual learners and teachers.

Prioritize reliability, bilingual usability, student privacy, measurable learning progress, and a strong institutional experience.

## 14. Golden rule

When uncertain about production identity, infrastructure, or data ownership:

**verify first; do not guess.**

For this repository, the authoritative production references are:

```
Repository: vitechintelligence/CareerCompass-Junior
Canonical origin: https://career-compass-junior-vitech.vercel.app
Neon project: Career Compass LMS
Neon project ID: royal-queen-79814128
```
