# Career Compass Junior Mastery — Platform Architecture

## Product mission

Career Compass Junior Mastery is a bilingual Vietnamese-English learning platform that connects the printed Career Compass Junior program with interactive e-learning, teacher delivery tools and partner-school administration.

The system is intentionally not a generic LMS. The book and program progression remain the curriculum source of truth; the platform makes that curriculum interactive, trackable and supportable.

## Primary roles

### Student
- Uses controlled credentials issued by a partner organization or platform operator.
- Opens assigned books and units.
- Completes interactive activities.
- Submits assignments and reflections.
- Sees teacher feedback, progress and achievements.
- Builds a learner evidence record through `learning_capsules`.

### Teacher
- Sees assigned classes only.
- Reviews rosters and attendance.
- Assigns book activities and teacher-created work.
- Reviews student submissions.
- Gives structured feedback.
- Validates appropriate learning evidence.

### Partner administrator
- Belongs to a school or training center.
- Manages teachers and students within that organization.
- Creates and manages classes.
- Assigns teachers.
- Manages enrollments, announcements and resources.
- Reviews program-level progress, attendance and delivery health.
- Can see operational payment status without storing payment-card data.

## Domain model

The persistence model is split into five coherent areas.

### 1. Organization and access
`organizations`, `profiles`, `student_credentials`, `organization_memberships`

This layer answers: who can enter, which organization they belong to, and what role they hold.

### 2. Classroom delivery
`classes`, `class_memberships`, `teacher_assignments`, `attendance`

This layer answers: who teaches whom, in which class, and whether the learner attended.

### 3. Curriculum and e-learning
`books`, `book_units`, `activities`, `student_enrollments`, `book_progress`, `activity_attempts`

This layer turns Career Compass Junior books into interactive curriculum without severing the connection to the printed program.

### 4. Teaching workflow
`assignments`, `submissions`, `teacher_feedback`, `announcements`, `resources`, `payments`

This layer supports daily delivery and partner operations.

### 5. Evidence layer
`learning_capsules`

`learning_capsules` is the central evidence layer. It stores compact, useful evidence metadata and integrity information, not a large centralized archive of sensitive learner files.

Examples of capsule sources:
- completed speaking task
- teacher-reviewed project
- submitted reflection
- classroom observation
- program milestone

A capsule can move through `draft → verified → released` and may be revoked if required.

## Privacy model

The platform follows data minimization by design.

Do not store unnecessary sensitive learner information in the LMS database. In particular, the core schema is not intended for home addresses, government IDs, health information, raw parent financial information or unrestricted media archives.

Operational identity should use semantic IDs and controlled account credentials. Sensitive evidence can later be stored in learner-controlled or appropriately protected storage, while the platform stores only the metadata and integrity proof needed to connect that evidence to the learning journey.

## Bilingual design

English and Vietnamese are first-class content fields rather than machine-translated decoration. Curriculum entities therefore use paired fields such as `title_en` / `title_vi` and `instructions_en` / `instructions_vi`.

The UI should preserve the same task structure across both languages so a learner or parent can switch language without losing context.

## Interactive book model

A printed book maps to:

`Book → Unit → Activity → Attempt → Feedback/Evidence`

Supported activity types currently include:
- Look, Listen & Say
- Speaking Model
- Listening
- Matching
- Sorting
- Multiple Choice
- Writing
- Reflection
- Project
- Self Check
- Teacher Check
- Resource

Interactive activities should remain educationally coherent with the exact book page rather than becoming disconnected games.

## Technical baseline

- Next.js App Router
- React
- TypeScript
- Neon PostgreSQL using `@neondatabase/serverless`
- Vercel-compatible runtime
- Repository CI for type checking and production builds

## Delivery rule

Changes should normally land through a feature branch and pull request. The `main` branch should stay deployable.

## Next implementation stages

1. Confirm the existing authentication provider and connect `auth_subject` to real identities.
2. Apply `db/schema.sql` to the designated Neon project.
3. Seed curriculum-only data with `db/seed.sql`.
4. Replace portal demo metrics with server-side Neon queries.
5. Add partner organization onboarding and controlled student credential issuance.
6. Build class roster, attendance, teacher assignment and enrollment flows.
7. Build interactive book renderer from `activities.content`.
8. Add assignment/submission/feedback workflows.
9. Add capsule creation and teacher verification workflow.
10. Add organization reporting and payment-status integration.
