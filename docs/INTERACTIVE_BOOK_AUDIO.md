# Interactive Book Audio

## Goal

The interactive books teach natural communication, so listening playback should sound conversational rather than like slow, monotone text-to-speech.

## Current behavior

The complete MY COMPASS and Career Compass Junior editions provide:

- **Natural conversation** mode for normal listening and shadowing.
- **Slow practice** mode for deliberate listening without changing the wording.
- A learner-selectable English voice picker.
- Automatic preference for higher-quality voices when the learner's browser exposes names such as natural, neural, online, WaveNet, premium, enhanced or studio.
- Microphone recording and replay for learner speaking practice.

The selected mode and voice are stored locally on the learner's device.

## Audio quality hierarchy

1. Pre-generated conversational audio listed in `/interactive-books/audio/manifest.json`, when deployed.
2. The selected high-quality English device/browser voice.
3. The best remaining English browser voice.

This means the books remain usable without a paid speech provider while preserving a clean upgrade path to consistent studio-quality audio.

## Production audio recommendation

For fixed vocabulary, dialogues, listening models and speaking examples, pre-generate natural conversational audio on the server or during the content-build process and publish only the resulting audio files plus manifest. Keep any provider credential outside browser HTML and outside the public repository.

Use browser speech synthesis as a fallback, not as the final quality target for every learner device.

## Pedagogy

Natural-conversation mode should keep ordinary rhythm, linking and phrasing. Slow-practice mode should reduce rate modestly without exaggerating individual words or producing unnatural syllable-by-syllable speech. The goal is intelligibility first, then transfer into realistic communication.
