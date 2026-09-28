import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assessmentEvidenceLevel,
  evidenceStatusForLevel,
  scorePercent,
  summarizeEvidenceLevels,
} from "../lib/evidence/evidence-policy";

test("assessment threshold separates practiced from demonstrated", () => {
  assert.equal(assessmentEvidenceLevel({ score: 6, maxScore: 10, demonstratedThreshold: 70 }), "practiced");
  assert.equal(assessmentEvidenceLevel({ score: 7, maxScore: 10, demonstratedThreshold: 70 }), "demonstrated");
});

test("teacher verification is the only path to verified assessment evidence", () => {
  assert.equal(assessmentEvidenceLevel({ score: 10, maxScore: 10, demonstratedThreshold: 70 }), "demonstrated");
  assert.equal(assessmentEvidenceLevel({ score: 2, maxScore: 10, demonstratedThreshold: 70, teacherVerified: true }), "verified");
  assert.equal(evidenceStatusForLevel("verified"), "verified");
  assert.equal(evidenceStatusForLevel("demonstrated"), "draft");
});

test("score percent is bounded and safe", () => {
  assert.equal(scorePercent(12, 10), 100);
  assert.equal(scorePercent(-2, 10), 0);
  assert.equal(scorePercent(5, 0), 0);
});

test("parent evidence summary preserves evidence levels", () => {
  const summary = summarizeEvidenceLevels([
    { titleEn: "A", titleVi: "A", level: "practiced", sourceType: "activity_attempt" },
    { titleEn: "B", titleVi: "B", level: "demonstrated", sourceType: "assessment_attempt" },
    { titleEn: "C", titleVi: "C", level: "verified", sourceType: "submission" },
  ]);
  assert.equal(summary.practiced.length, 1);
  assert.equal(summary.demonstrated.length, 1);
  assert.equal(summary.verified.length, 1);
});
