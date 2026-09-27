import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateUnitProgress, practiceStorageKey } from "../lib/learning/progress-policy";

test("progress denominator includes published units with no progress row", () => {
  assert.equal(aggregateUnitProgress(4, [100, 100]), 50);
  assert.equal(aggregateUnitProgress(4, [100, 0, 0, 0]), 25);
  assert.equal(aggregateUnitProgress(4, []), 0);
});

test("progress values are bounded before aggregation", () => {
  assert.equal(aggregateUnitProgress(2, [120, -5]), 50);
});

test("local practice keys are enrollment or guest-session scoped", () => {
  const a = practiceStorageKey("enrollment:aaa", "completed");
  const b = practiceStorageKey("enrollment:bbb", "completed");
  const guest = practiceStorageKey("guest:session-1", "completed");
  assert.notEqual(a, b);
  assert.notEqual(a, guest);
  assert.equal(practiceStorageKey("enrollment:aaa", "reflection", 3), "ccj-unit1:enrollment:aaa:reflection:3");
});
