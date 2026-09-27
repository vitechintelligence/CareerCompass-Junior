import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignmentAttentionBucket,
  learnerCanEditSubmission,
  reviewDecisionStatus,
  teacherCanReviewSubmission,
} from "../lib/classroom/submission-policy";

test("learner edits only draft or returned work", () => {
  assert.equal(learnerCanEditSubmission(null), true);
  assert.equal(learnerCanEditSubmission("draft"), true);
  assert.equal(learnerCanEditSubmission("returned"), true);
  assert.equal(learnerCanEditSubmission("submitted"), false);
  assert.equal(learnerCanEditSubmission("accepted"), false);
});

test("teacher reviews submitted work and decisions map to returned/accepted", () => {
  assert.equal(teacherCanReviewSubmission("submitted"), true);
  assert.equal(teacherCanReviewSubmission("draft"), false);
  assert.equal(reviewDecisionStatus("return"), "returned");
  assert.equal(reviewDecisionStatus("verify"), "accepted");
});

test("attention queue separates review retry and overdue", () => {
  const now = new Date("2026-09-28T00:00:00Z");
  assert.equal(assignmentAttentionBucket({ submissionStatus: "submitted", dueAt: null, now }), "pending_review");
  assert.equal(assignmentAttentionBucket({ submissionStatus: "returned", dueAt: null, now }), "learner_retry");
  assert.equal(assignmentAttentionBucket({ submissionStatus: null, dueAt: new Date("2026-09-20T00:00:00Z"), now }), "overdue");
  assert.equal(assignmentAttentionBucket({ submissionStatus: "accepted", dueAt: new Date("2026-09-20T00:00:00Z"), now }), "none");
});
