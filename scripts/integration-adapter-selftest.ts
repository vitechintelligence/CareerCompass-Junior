import assert from "node:assert/strict";
import { runAdapterDiagnostic } from "../lib/integration-diagnostics";
import { getEducationAdapter, hasDedicatedEducationAdapter } from "../lib/provider-adapters";
import { safeIntegrationConfig, validateCanonicalObject } from "../lib/integration-adapter-core";

const providers = [
  "xapi-lrs",
  "zalo-oa",
  "scorm-package",
  "canvas",
  "google-classroom",
  "microsoft-teams-edu",
  "moodle",
  "custom-rest",
  "generic-webhook",
  "clever",
  "oneroster",
  "vimeo",
  "zoom",
];

for (const provider of providers) {
  const diagnostic = runAdapterDiagnostic(provider);
  assert.equal(
    diagnostic.ok,
    true,
    `${provider}: ${diagnostic.checks.flatMap((check) => check.errors).join("; ")}`,
  );
  assert.equal(
    diagnostic.adapterMode,
    hasDedicatedEducationAdapter(provider) ? "dedicated" : "canonical-generic",
  );
}

const oneRoster = getEducationAdapter("oneroster");
const deletedEnrollment = oneRoster.normalizeEnrollment({
  sourcedId: "enrollment-delete",
  classSourcedId: "class-1",
  userSourcedId: "user-1",
  role: "student",
  status: "tobedeleted",
});
assert.equal(deletedEnrollment.status, "inactive");
assert.equal(validateCanonicalObject("enrollment", deletedEnrollment).ok, true);

const firstEvent = getEducationAdapter("custom-rest").normalizeLearningEvent({
  type: "activity.completed",
  userId: "user-1",
  activityId: "activity-1",
  timestamp: "2026-09-18T12:00:00Z",
});
const replayedEvent = getEducationAdapter("custom-rest").normalizeLearningEvent({
  type: "activity.completed",
  userId: "user-1",
  activityId: "activity-1",
  timestamp: "2026-09-18T12:00:00Z",
});
assert.equal(firstEvent.eventKey, replayedEvent.eventKey, "Generated event keys must be deterministic for idempotency.");

const cleanConfig = safeIntegrationConfig({
  baseUrl: "https://school.example/api",
  tokenUrl: "https://school.example/oauth/token",
  accessToken: "remove-me",
  nested: { clientSecret: "remove-me", safeSetting: "keep-me" },
});
assert.equal(cleanConfig.baseUrl, "https://school.example/api");
assert.equal(cleanConfig.tokenUrl, "https://school.example/oauth/token");
assert.equal("accessToken" in cleanConfig, false);
assert.deepEqual(cleanConfig.nested, { safeSetting: "keep-me" });

console.log(`Integration adapter self-test passed for ${providers.length} provider profiles.`);
