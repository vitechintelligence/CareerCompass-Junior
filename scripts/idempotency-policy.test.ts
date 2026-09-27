import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeSubmissionId,
  reuseOrCreateSubmission,
  unitLessonSubmissionStorageKey,
} from "../lib/learning/idempotency";

test("only UUID v4 submission identifiers are accepted", () => {
  assert.equal(normalizeSubmissionId("550e8400-e29b-41d4-a716-446655440000"), "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(normalizeSubmissionId("550e8400-e29b-11d4-a716-446655440000"), null);
  assert.equal(normalizeSubmissionId("not-a-uuid"), null);
});

test("same logical retry reuses submission id", () => {
  let created = 0;
  const create = () => {
    created += 1;
    return created === 1
      ? "550e8400-e29b-41d4-a716-446655440000"
      : "550e8400-e29b-41d4-a716-446655440001";
  };
  const first = reuseOrCreateSubmission(null, "answer:a", create);
  const retry = reuseOrCreateSubmission(first, "answer:a", create);
  assert.equal(retry.submissionId, first.submissionId);
  assert.equal(created, 1);
  const changed = reuseOrCreateSubmission(retry, "answer:b", create);
  assert.notEqual(changed.submissionId, first.submissionId);
  assert.equal(created, 2);
});

test("legacy bridge submission keys are enrollment-scoped", () => {
  assert.notEqual(
    unitLessonSubmissionStorageKey("enrollment:a", 1),
    unitLessonSubmissionStorageKey("enrollment:b", 1),
  );
});
