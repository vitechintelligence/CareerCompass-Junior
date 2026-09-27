import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ActivityContractError,
  activityContractHash,
  buildActivityContract,
  learnerActivityContract,
  requireActivityContentVersion,
} from "../lib/learning/activity-contract";
import {
  explicitClassLearningContext,
  normalizeGradeLevel,
} from "../lib/learning/learner-context";

function base(overrides: Record<string, unknown> = {}) {
  return {
    activityId: "11111111-1111-4111-8111-111111111111",
    activityCode: "A03",
    courseId: "CCJ-BIG-IDEAS",
    unitId: "U01",
    activityType: "self_check",
    contentVersion: 1,
    ageBand: "7-12",
    englishLevel: "A0-A2",
    objectiveEn: "Give a reason.",
    objectiveVi: "Đưa ra lý do.",
    instructionsEn: "Choose the phrase.",
    instructionsVi: "Chọn cụm từ.",
    content: { options: ["because", "hello", "blue"], answer: "because" },
    ...overrides,
  };
}

test("objective activity contract keeps answer server-side and learner serialization removes it", () => {
  const contract = buildActivityContract(base() as never);
  assert.equal(contract.inputType, "single_choice");
  assert.equal(contract.contentVersion, 1);
  assert.deepEqual(contract.answerDefinition, { type: "single_choice", correctValue: "because" });
  assert.equal("answer" in contract.content, false);

  const learner = learnerActivityContract(contract, "22222222-2222-4222-8222-222222222222");
  assert.equal(learner.assignedEnrollmentId, "22222222-2222-4222-8222-222222222222");
  assert.equal("answerDefinition" in learner.activity, false);
});

test("legacy lesson ID comes only from explicit activity metadata, not a class label", () => {
  const contract = buildActivityContract(base({
    activityCode: "U01-L03",
    content: { lessonId: 3, kind: "sequence" },
  }) as never);
  assert.equal(contract.lessonId, "L03");
});

test("open speaking contract records practice and requires review before demonstrated evidence", () => {
  const contract = buildActivityContract(base({
    activityType: "speaking_model",
    content: { model: "My idea can help people." },
  }) as never);
  assert.equal(contract.inputType, "speaking_text");
  assert.deepEqual(contract.completionRule, { type: "review_required", practicedOnSubmission: true });
  assert.equal(contract.evidencePolicy.verified, "teacher_approval");
});

test("content version mismatch is explicit and fail-closed", () => {
  assert.equal(requireActivityContentVersion(2, 2), 2);
  assert.throws(
    () => requireActivityContentVersion(1, 2),
    (error: unknown) => error instanceof ActivityContractError &&
      error.code === "content_version_mismatch" &&
      error.status === 409,
  );
});

test("contract hash changes when the authoritative content version changes", () => {
  const first = buildActivityContract(base() as never);
  const second = buildActivityContract(base({ contentVersion: 2 }) as never);
  assert.notEqual(activityContractHash(first), activityContractHash(second));
});

test("class learning context uses explicit fields and never parses the class name", () => {
  assert.equal(normalizeGradeLevel("11"), "11");
  assert.equal(normalizeGradeLevel("Grade 11"), null);
  const context = explicitClassLearningContext({
    gradeLevel: null,
    learnerAgeBand: "14–16",
    englishLevel: "A2",
    className: "Grade 11 Science",
  } as never);
  assert.deepEqual(context, {
    gradeLevel: null,
    learnerAgeBand: "14-16",
    englishLevel: "A2",
  });
});
