import assert from "node:assert/strict";
import { test } from "node:test";
import { absoluteUrl } from "../lib/site";
import {
  allowedLtiTargetLinkUri,
  audienceAllowsClient,
  ltiRoleKind,
  safeCareerCompassTargetPath,
  stableHash,
} from "../lib/lti/policy";
import { connectorIsPlugAndPlay, getConnectorReadiness } from "../lib/integration-readiness";

test("LTI target_link_uri is restricted to the registered Career Compass launch endpoint", () => {
  assert.equal(allowedLtiTargetLinkUri(absoluteUrl("/api/lti/launch")), true);
  assert.equal(allowedLtiTargetLinkUri(absoluteUrl("/workspace")), false);
  assert.equal(allowedLtiTargetLinkUri("https://attacker.example/api/lti/launch"), false);
});

test("LTI custom targets cannot escape approved Career Compass surfaces", () => {
  assert.equal(safeCareerCompassTargetPath("/learn/junior-1"), "/learn/junior-1");
  assert.equal(safeCareerCompassTargetPath("/books"), "/books");
  assert.equal(safeCareerCompassTargetPath("https://evil.example"), "/workspace");
  assert.equal(safeCareerCompassTargetPath("//evil.example/path"), "/workspace");
});

test("LTI role mapping treats signed instructors as teachers and learners as students", () => {
  assert.equal(ltiRoleKind(["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"]), "teacher");
  assert.equal(ltiRoleKind(["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"]), "student");
});

test("LTI audience validation requires azp for multi-audience tokens", () => {
  assert.equal(audienceAllowsClient("client-1", undefined, "client-1"), true);
  assert.equal(audienceAllowsClient(["client-1","client-2"], "client-1", "client-1"), true);
  assert.equal(audienceAllowsClient(["client-1","client-2"], "client-2", "client-1"), false);
  assert.equal(audienceAllowsClient(["other"], undefined, "client-1"), false);
});

test("LTI state hashing is deterministic without exposing opaque state", () => {
  assert.equal(stableHash("state-1"), stableHash("state-1"));
  assert.notEqual(stableHash("state-1"), stableHash("state-2"));
  assert.notEqual(stableHash("state-1"), "state-1");
});

test("Moodle and Canvas expose implemented Tool runtime without claiming live plug-and-play", () => {
  const moodle = getConnectorReadiness("moodle");
  const canvas = getConnectorReadiness("canvas");
  assert.equal(moodle.stage, "tool_runtime");
  assert.equal(canvas.stage, "tool_runtime");
  assert.equal(connectorIsPlugAndPlay(moodle), false);
  assert.equal(connectorIsPlugAndPlay(canvas), false);
});
