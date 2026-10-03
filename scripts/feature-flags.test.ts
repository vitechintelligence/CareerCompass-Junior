import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFeatureFlag, RISKY_FEATURE_ENV } from "../lib/feature-flags";

test("risky rollout flags are default-off and require exact true", () => {
  assert.equal(parseFeatureFlag(undefined), false);
  assert.equal(parseFeatureFlag("false"), false);
  assert.equal(parseFeatureFlag("1"), false);
  assert.equal(parseFeatureFlag("TRUE"), true);
  assert.equal(parseFeatureFlag(" true "), true);
});

test("rollout and privacy rollback features have independent env names", () => {
  assert.deepEqual(Object.keys(RISKY_FEATURE_ENV).sort(), [
    "deletionReview",
    "guardianReporting",
    "integrationJobExecution",
    "learnerDataExport",
    "learningWriteQuotas",
    "offlineOutbox",
    "timedAssessments",
  ]);
  assert.equal(new Set(Object.values(RISKY_FEATURE_ENV)).size, 7);
});
