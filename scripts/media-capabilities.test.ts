import assert from "node:assert/strict";
import { test } from "node:test";
import {
  capabilitySummary,
  chooseRecorderMime,
  microphoneErrorMessage,
} from "../lib/device/media-recorder";

test("recorder MIME negotiation prefers Opus/WebM then Safari-compatible MP4", () => {
  assert.equal(
    chooseRecorderMime((mime) => mime === "audio/webm;codecs=opus" || mime === "audio/mp4"),
    "audio/webm;codecs=opus",
  );
  assert.equal(
    chooseRecorderMime((mime) => mime === "audio/mp4"),
    "audio/mp4",
  );
  assert.equal(chooseRecorderMime(() => false), "");
});

test("microphone errors produce actionable permission/device messages", () => {
  assert.match(microphoneErrorMessage({ name: "NotAllowedError" }, "en"), /permission/i);
  assert.match(microphoneErrorMessage({ name: "NotFoundError" }, "en"), /No microphone/i);
  assert.match(microphoneErrorMessage({ name: "NotReadableError" }, "en"), /busy|unavailable/i);
});

test("capability summary never treats insecure context as microphone-ready", () => {
  const summary = capabilitySummary({
    secureContext: false,
    mediaDevices: true,
    mediaRecorder: true,
    recorderMime: "audio/mp4",
    speechSynthesis: true,
    serviceWorker: true,
    online: true,
    standalone: false,
  });
  assert.equal(summary.microphoneReady, false);
  assert.equal(summary.recorderMime, "audio/mp4");
});
