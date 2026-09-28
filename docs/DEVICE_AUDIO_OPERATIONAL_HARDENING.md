# Device, Accessibility and Audio Hardening — Phase 10

This stage hardens the real learner product for the device matrix required by the remediation plan.

## Implemented in code

- cross-browser MediaRecorder MIME negotiation:
  - audio/webm;codecs=opus
  - audio/webm
  - audio/mp4
  - audio/aac
  - browser default fallback
- actionable microphone permission/device/busy/interruption messages
- stream cleanup on stop, interruption and page hide
- local playback preserves the actual recorded MIME type
- full interactive book recorder hardened in addition to the React Unit 1 recorder
- private routes remain excluded from service-worker caches
- protected navigation can fall back only to the public offline explanation
- global offline/reconnected status never claims an unsynced change is saved
- visible keyboard focus baseline
- prefers-reduced-motion baseline
- accessible recording state and playback labels
- accessible PWA install dialog semantics
- /device-check diagnostics page for physical acceptance

## Automated acceptance

CI verifies:
- recorder MIME selection priority
- microphone error mapping
- secure-context requirement
- private service-worker exclusions
- protected navigation offline fallback
- interactive-book SafeMediaRecorder compatibility injection
- microphone self-only Permissions-Policy

## Physical acceptance matrix

These require an actual device/browser run and are NOT claimed complete by CI alone:

| Target | Audio/mic | Replay | Offline/reconnect | Auth save/reload | PWA | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop Chrome | pending | pending | pending | pending | n/a | not physically verified |
| Android Chrome | pending | pending | pending | pending | pending | not physically verified |
| iPhone Safari | pending | pending | pending | pending | Add to Home Screen | not physically verified |
| Installed PWA | pending | pending | pending | pending | installed | not physically verified |

Use /device-check on each target, then run one authenticated learner save/reload cycle and one microphone record/replay cycle.

No AI pronunciation score is displayed or claimed.
