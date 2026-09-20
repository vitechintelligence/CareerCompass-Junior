# Interactive Ebook Conversion Status

Last reviewed: 2026-09-20

## Executive status

The repository's original database-driven interactive-book layer remains only partially seeded in Neon. This review also inspected the two complete standalone interactive editions supplied for **MY COMPASS** and **Career Compass Junior Mastery — Beginner**.

Those two supplied editions are now wired into the application as the primary interactive experiences for their book codes:

| Book | Interactive content coverage | Platform evidence sync | Status |
| --- | --- | --- | --- |
| Career Compass Junior — Big Ideas, Bright Futures | 2 published database units / 6 activities | Yes for seeded activities | Partial |
| Career Compass Junior Mastery — Beginner | 12 units / 96 lessons, including assessment and projects | Existing database activities only; full-edition progress is currently local to the interactive book | Content-complete; platform sync still partial |
| MY COMPASS | 12 units / 24 lessons + capstone | Existing database activities only; full-edition progress is currently local to the interactive book | Content-complete; platform sync still partial |
| EERS Action City — My First Sound Adventures | 2 published database units / 6 activities | Yes for seeded activities | Partial |

The original Neon curriculum layer still contains **7 published units and 28 activities** across the four titles. The complete MY COMPASS and Career Compass Junior editions are served as embedded full-book experiences rather than pretending those 120 lessons are already represented by the older generic database rows.

## MY COMPASS inspection

The replacement edition is structurally complete as an interactive workbook:

- 12 units and 24 lessons, two lessons per unit.
- Progression covers Personal Development, Social Skills, Collaboration, Leadership, Subject Exploration, Skills Discovery, Career Exploration and University Readiness.
- Every lesson contains its required lesson structure, including story/context, key idea, reflection or thinking prompts, vocabulary, English/Vietnamese phrase support, listening content, interactive work and self-check/reflection.
- Supported activities include choice, fill-in, free response, matching and sorting.
- The capstone includes five "I can" checks, five speaking prompts and five interview questions.
- Learner progress is persisted locally in the browser and microphone recording/replay is available.

## Career Compass Junior Mastery — Beginner inspection

The supplied complete edition contains:

- 12 units and 96 lessons, exactly eight lessons per unit.
- Continuous lesson numbering from 1 through 96 with no duplicate lesson IDs.
- Unit projects, English communication work, reflection and career/life-skill themes across the full progression.
- Lesson 94 is intentionally an assessment lesson with its own listening, reading, writing and next-step structure.
- XP, levels, streaks, badges, local progress, interactive tasks and microphone recording/replay.

This complete edition now replaces the former one-unit database experience as the primary student-facing interactive book for code `CCJ-MASTERY-BEGINNER`.

## Conversational audio upgrade

Both complete editions now expose learner-facing voice controls:

- **Natural conversation** — normal conversational playback pacing.
- **Slow practice** — slower playback for deliberate listening and shadowing.
- **Voice picker** — lets the learner select from the best available English voices on the device.
- Automatic voice ranking prefers voices identified by the browser/device as natural, neural, online, WaveNet, premium, enhanced or studio quality.
- The audio layer can prefer pre-generated natural/studio audio from an audio manifest when such assets are deployed, then fall back to the best available device voice.

The current repository does **not** contain a full studio-recorded MP3 set. Therefore the quality of fallback speech still depends on the voices available on the learner's browser/device. This is intentionally stated rather than presenting browser speech synthesis as equivalent to professionally generated conversational audio.

## What is already integrated

- Public book catalog and routes for all four books.
- Complete embedded MY COMPASS and Career Compass Junior Mastery editions.
- Legacy unit URLs for those two titles redirect into the corresponding full edition and unit.
- EN/VI support inside the supplied interactive editions.
- Listening/speaking prompts, learner recording and replay.
- Natural-conversation / slow-practice audio choices.
- Database-driven activities, `activity_attempts`, `book_progress` and learning-capsule evidence for the activities already seeded in Neon.

## Remaining platform gap

The two complete standalone books use their own local progress stores. Their entire 24-lesson and 96-lesson completion history is **not yet synchronized lesson-by-lesson into Neon**, so teacher and partner analytics do not yet receive every action performed inside those full editions.

The existing `/api/learning/attempt` endpoint validates against published database activity IDs. A proper next integration phase should map the complete book lesson/activity identifiers into the platform evidence model rather than accepting arbitrary client-generated activity IDs.

Until that bridge is complete, distinguish:

- **Content-complete interactive edition** — MY COMPASS and Career Compass Junior Mastery.
- **Fully platform-integrated interactive edition** — requires complete Neon progress/evidence/teacher analytics synchronization.

## Still incomplete

### Career Compass Junior — Big Ideas, Bright Futures

The final source book is broader than the two currently seeded interactive units. The remaining Discover → Build → Create → Reflect pages/projects/evidence activities still require structured conversion.

### EERS Action City

The 24-page workbook still needs a page-by-page/activity-by-activity digital mapping for its A–Z sounds, movement, tracing substitutes, drawing, speaking and parent/teacher prompts.

## Completion standard for full platform integration

A book should be called **fully platform-integrated** only when:

1. Every instructional unit/lesson/page sequence in the current final edition has a mapped app destination.
2. Core printed activities have a suitable digital interaction rather than generic placeholder content.
3. EN/VI instructions align with the final edition.
4. Progress is persisted in `activity_attempts` and `book_progress`.
5. Evidence-eligible work can produce learning-capsule metadata.
6. Student navigation supports resume/continue across the whole title.
7. Teacher and partner views can see useful progress without unnecessary learner data.
8. Mobile behavior, accessibility and error states pass QA.

## Public messaging

For MY COMPASS and Career Compass Junior Mastery, **complete interactive edition** is appropriate for content coverage.

For Big Ideas, Bright Futures and EERS Action City, continue using:

- "interactive book pathways"
- "interactive previews"
- "book-to-app learning experiences"

Do not imply that all four titles are fully digitized or fully synchronized with platform analytics yet.
