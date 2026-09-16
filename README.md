# Career Compass Junior Mastery

Bilingual interactive LMS for **students, teachers and partner organizations**, built around the Career Compass Junior curriculum and Mastery English learning journey.

## What is included in the platform

- Student Portal
- Teacher Portal
- Partner / School / Training Center Portal
- English + Vietnamese UI/content model
- Career Compass Junior interactive-book data model
- Classes and memberships
- Controlled student credential model
- Teacher assignments
- Student enrollments and book progress
- Interactive activities and attempts
- Attendance
- Assignments and submissions
- Teacher feedback
- Payments status
- Announcements and resources
- `learning_capsules` as the central learner evidence layer
- Neon PostgreSQL adapter
- Vercel-compatible Next.js app
- GitHub Actions CI

## Interactive learning milestone

The first integrated learner experience is available at:

```text
/learn/unit-1?lang=en
/learn/unit-1?lang=vi
```

Unit 1 currently provides eight lesson-specific learning experiences with:

- bilingual lesson navigation
- Look · Listen · Say vocabulary
- browser pronunciation playback
- speaking models and rhythm practice
- retryable interactive checks
- local reflection and preview progress
- an ephemeral speaking recorder for record → replay → retry

The preview recorder never uploads audio. Audio blobs remain temporary in the learner's browser and disappear when the page/session is cleared. Preview reflections and completion state are stored only in browser local storage until authenticated learner persistence is connected to Neon.

## Stack

- Next.js 16
- React 19
- TypeScript
- Neon PostgreSQL
- Vercel

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

Set the Neon pooled connection string:

```bash
DATABASE_URL=postgresql://...
```

Do not commit real credentials.

## Database

The complete bootstrap schema is in:

```text
db/schema.sql
```

A curriculum-only demo seed is in:

```text
db/seed.sql
```

The seed intentionally contains **no real learner data**.

## Platform architecture

See [`docs/PLATFORM_ARCHITECTURE.md`](docs/PLATFORM_ARCHITECTURE.md) for role boundaries, data ownership, privacy rules, interactive-book structure and implementation stages.

## Engineering rule

`main` should remain deployable. Product work should normally move through a feature branch + pull request with CI passing before merge.
