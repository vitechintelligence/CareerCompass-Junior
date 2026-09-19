# Interactive Ebook Conversion Status

Last reviewed: 2026-09-18

## Executive status

The interactive-book engine is working and all four book codes are published. **MY COMPASS now has a complete interactive edition hosted externally and linked from the Career Compass app.** The other three source books have not yet been converted end-to-end into complete interactive ebooks inside the platform.

Current production curriculum coverage in Neon:

| Book | Current published interactive units | Published activities | Source-book scope | Status |
| --- | ---: | ---: | --- | --- |
| Career Compass Junior — Big Ideas, Bright Futures | 2 | 6 | 40-page final edition | Partial |
| Career Compass Junior Mastery — Beginner | 1 | 10 | 12 units / 96 lessons / 244-page final edition | Partial |
| MY COMPASS | 2 internal Neon units / complete external edition | 6 internal activities | 12 units / 70-page final edition | Complete interactive edition linked externally; internal LMS mapping remains partial |
| EERS Action City — My First Sound Adventures | 2 | 6 | 24-page final edition | Partial |

Total currently published in Neon: **7 units and 28 activities**.

## What is already built

- Public book catalog and routes for all four books.
- EN/VI switching at book and unit level.
- Database-driven published units and activities with catalog fallback.
- Shared interactive activity renderer.
- Text-to-speech vocabulary and speaking models.
- Multiple-choice checks and ordering interactions.
- Writing/reflection capture.
- Progress synchronization through `activity_attempts` for signed-in learners.
- Learning evidence eligibility and the central learning-capsule model.
- A richer enhanced Unit 1 experience for Career Compass Junior Mastery with voice practice, local audio recording/replay, reflection and progress sync.

## Current limitation

The generic curriculum in Neon currently uses only:

- `look_listen_say`
- `speaking_model`
- `self_check`

The activity engine can already support a broader family of activity types, but the source books have not yet been fully mapped and seeded into those structures.

## Source-to-app gaps

### Career Compass Junior — Big Ideas, Bright Futures

The final source book is 40 pages and contains a broader Discover → Build → Create → Reflect journey. The app currently exposes only two interactive units. The remaining pages/projects/reflection/evidence activities still need structured conversion.

### Career Compass Junior Mastery — Beginner

The final source book contains 12 units and 96 lessons. Neon currently contains one published database unit. The separate enhanced Unit 1 experience proves a richer interaction model, but it does not yet represent the entire 96-lesson book.

### MY COMPASS

The final source book contains 12 units, including Career Exploration and University Readiness. A complete interactive edition is now linked from the Career Compass app to the approved external artifact. Neon still exposes only Units 1–2 internally, so LMS-native progress/evidence integration for the complete edition is a separate follow-up from the ebook conversion itself.

### EERS Action City

The final workbook is 24 pages with A–Z sounds, pencil play, action games, movement, drawing, speaking and celebration activities. The app currently exposes two broad interactive units, not a page-by-page/activity-by-activity digital equivalent.

## Completion standard

A book should be called **fully interactive** only when:

1. Every instructional unit/lesson/page sequence in the current final edition has a mapped app destination.
2. Core printed activities have a suitable digital interaction rather than being represented only by generic placeholder content.
3. EN/VI instructions are aligned with the final edition.
4. Progress is persisted in `activity_attempts` and `book_progress`.
5. Evidence-eligible work can produce learning-capsule metadata.
6. Student navigation supports resume/continue across the whole title.
7. Teacher and partner views can see useful progress without exposing unnecessary learner data.
8. Mobile behavior, accessibility and error states pass QA.

## Recommended conversion order

1. **Career Compass Junior Mastery — Beginner**
   - Convert Units 2–12 and all 96 lessons using the enhanced Unit 1 pattern as the quality bar.
2. **MY COMPASS LMS integration**
   - Keep the complete interactive edition as the learner-facing ebook and, if required, later connect completion/progress signals back to the Career Compass LMS.
3. **EERS Action City**
   - Map the full 24-page experience with sound, movement, tracing substitutes, simple parent/teacher prompts and child-safe interactions.
4. **Big Ideas, Bright Futures**
   - Map all 40 pages into Discover / Build / Create / Reflect interactive missions and evidence tasks.

## Public messaging rule until completion

Use phrases such as:

- "interactive book pathways"
- "interactive previews"
- "book-to-app learning experiences"

MY COMPASS may be described as a complete interactive ebook. Avoid implying that the other three source books are fully digitized until the completion standard above is met.
