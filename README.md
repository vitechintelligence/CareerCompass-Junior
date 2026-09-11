# Career Compass Junior Interactive — Unit 1 Proof of Product

A polished standalone proof-of-product for the Career Compass Junior Interactive digital book.

## What is implemented

- Printed-book activation flow (proof code: `CCJ-DEMO-UNIT1`)
- Student Home in the approved Career Compass Junior visual direction
- 12-unit illustrated journey map with Unit 1 active
- Unit 1 with Lessons 1–8 from the Beginner Student Book
- Interactive challenges for each lesson
- Model pronunciation using browser speech synthesis
- Temporary local voice recorder: record → replay → try again; recordings are not persisted
- IndexedDB progress, reflections, nickname, and activation status
- XP and Unit 1 achievements
- Mobile-first responsive experience
- PWA manifest + offline app-shell/runtime caching
- No student email requirement

## Privacy behavior in this proof

All learner state is stored locally in IndexedDB. Voice recordings are kept only in temporary browser memory and are discarded when replaced, the page is closed, or the component unmounts. There is no Neon or other server sync in this proof branch.

Production architecture will keep sensitive identity data in encrypted IndexedDB/device storage with mobile Keychain/Keystore protection for the encryption key, while pseudonymous learning performance can sync to Neon.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Content source

Unit 1 is based on the current Career Compass Junior Beginner Student Book: **Welcome, My Voice & My Strengths**, Lessons 1–8.
