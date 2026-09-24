# Career Compass Junior Mastery

Bilingual interactive LMS for **students, teachers and partner organizations**, built around the Career Compass Junior curriculum and Mastery English learning journey.

## What is included in the platform

- Student Portal and interactive learner experience
- Live Teacher Class Workspace
- Live Partner / School / Training Center Workspace
- Neon Auth with controlled role assignment
- English + Vietnamese UI/content model
- Career Compass Junior interactive-book data model
- database-driven reusable book/unit renderer
- classes and organization memberships
- teacher activation and class assignments
- student enrollments and persistent book progress
- interactive activities and attempts
- attendance
- assignments and submissions
- teacher feedback
- payments status
- announcements and resources
- `learning_capsules` as the central learner evidence layer
- Neon PostgreSQL adapter
- Vercel-compatible Next.js app
- GitHub Actions CI

## Live routes

```text
/learn/unit-1?lang=en                 Enhanced Unit 1 learner experience
/learn/unit-1?lang=vi                 Vietnamese learner experience
/learn/CCJ-MASTERY-BEGINNER/U01       Database-driven curriculum view
/auth/sign-in                         Neon Auth sign-in
/auth/sign-up                         Learner activation
/workspace/teacher                    Role-protected Teacher Workspace
/workspace/partner                    Partner onboarding / management
```

Unit 1 provides eight lesson-specific learning experiences with bilingual navigation, Look · Listen · Say vocabulary, browser pronunciation, speaking models, retryable interactive checks, reflection and an ephemeral record → replay → retry speaking recorder.

Anonymous preview progress remains on-device. When a learner signs in, completed Unit 1 lessons synchronize to Neon `activity_attempts` and `book_progress`. Evidence-eligible milestones create metadata-only `learning_capsules`. Recorded learner audio is never uploaded by this flow.

## Stack

- Next.js 16
- React 19
- TypeScript
- Neon PostgreSQL
- Neon Auth / Better Auth
- Vercel

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Production URL

The canonical production origin is:

`https://career-compass-junior-vitech.vercel.app`

The legacy `career-compass-junior-lake.vercel.app` host permanently redirects to the canonical origin. Neon Auth trusted domains must include the canonical HTTPS origin exactly.

## Production stack alignment

Career Compass Junior production must resolve through one stack:

```text
Frontend
  https://career-compass-junior-vitech.vercel.app
      ↓
Next.js server actions / API routes
      ↓
Neon Managed Better Auth + Neon Postgres
      ↓
Career Compass LMS — royal-queen-79814128
```

Vercel Production must declare:

```text
NEON_PROJECT_ID=royal-queen-79814128
NEON_BRANCH_ID=br-shiny-meadow-b3ibu54
DATABASE_URL=<pooled URL from that same branch>
NEON_AUTH_BASE_URL=<Auth URL from that same branch>
NEON_AUTH_COOKIE_SECRET=<32+ character secret>
NEXT_PUBLIC_APP_URL=https://career-compass-junior-vitech.vercel.app
```

`/api/health` checks database reachability, core/extended schema readiness, Auth configuration and non-secret runtime identity alignment. It does not expose connection strings, passwords, cookie secrets or tokens.

If `NEON_PROJECT_ID` is explicitly set to another project in production, database/Auth access is intentionally blocked rather than silently using the wrong backend.

## Environment

Configure server-only deployment variables:

```bash
NEON_PROJECT_ID=royal-queen-79814128
NEON_BRANCH_ID=br-shiny-meadow-b3ibu54
DATABASE_URL=postgresql://...
NEON_AUTH_BASE_URL=https://.../neondb/auth
NEON_AUTH_COOKIE_SECRET=<32+-character-random-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Do not commit real credentials.

## Database

Bootstrap the core model with:

```text
db/schema.sql
```

Apply later additive migrations from:

```text
db/migrations/
```

Seed published curriculum metadata with:

```text
db/seed.sql
```

The seed intentionally contains **no real learner data**.

## Access model

Self-registration maps to learner/student access only. Teacher access is activated by an approved partner administrator, and partner-administrator access is separately approved. The application does not allow public self-promotion into staff or partner roles.

## Platform architecture

See [`docs/PLATFORM_ARCHITECTURE.md`](docs/PLATFORM_ARCHITECTURE.md) for role boundaries, data ownership, privacy rules, interactive-book structure and implementation stages.

## Engineering rule

`main` should remain deployable. Product work should normally move through a feature branch + pull request with CI passing before merge.
