import assert from "node:assert/strict";
import { test } from "node:test";
import { LEARNING_WRITE_LIMITS, quotaScopeKeys } from "../lib/learning/write-quota-policy";

test("quota scopes separate personal and organization learner writes", () => {
  assert.deepEqual(quotaScopeKeys("student-1", null), {
    learner: "learner:student-1:personal",
    organization: null,
  });
  assert.deepEqual(quotaScopeKeys("student-1", "org-1"), {
    learner: "learner:student-1:org:org-1",
    organization: "organization:org-1",
  });
});

test("quota limits include both burst and daily boundaries", () => {
  assert.ok(LEARNING_WRITE_LIMITS.learnerMinute > 0);
  assert.ok(LEARNING_WRITE_LIMITS.learnerDay > LEARNING_WRITE_LIMITS.learnerMinute);
  assert.ok(LEARNING_WRITE_LIMITS.organizationMinute > LEARNING_WRITE_LIMITS.learnerMinute);
  assert.ok(LEARNING_WRITE_LIMITS.organizationDay > LEARNING_WRITE_LIMITS.learnerDay);
});
