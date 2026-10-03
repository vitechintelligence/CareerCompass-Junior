import assert from "node:assert/strict";
import { test } from "node:test";
import { EvidencePolicyError, evaluateActivityEvidence } from "../lib/learning/evidence-policy";

const choice = { activityType: "self_check", content: { options: ["yes", "no"], answer: "yes" }, maxScore: 1 };

test("a wrong answer cannot be turned into successful evidence by client flags", () => {
  const decision = evaluateActivityEvidence(choice, { selected: "no", correct: true, completed: true, score: 1 });
  assert.equal(decision.level, "PRACTICED");
  assert.equal(decision.result, "incorrect");
  assert.equal(decision.score, 0);
  assert.equal(decision.completionStatus, "submitted");
  assert.match(decision.feedback.en, /Not yet/);
});

test("correct answer demonstrates objective; repeated wrong and retry remain independent", () => {
  assert.equal(evaluateActivityEvidence(choice, { selected: "no" }).level, "PRACTICED");
  assert.equal(evaluateActivityEvidence(choice, { selected: "no" }).result, "incorrect");
  const retried = evaluateActivityEvidence(choice, { selected: "yes" });
  assert.equal(retried.level, "DEMONSTRATED");
  assert.equal(retried.score, 1);
  assert.equal(retried.completionStatus, "completed");
});

test("missing or malformed keys fail closed and cannot be self-reported as an objective result", () => {
  for (const content of [
    { options: ["yes", "no"] },
    { options: ["yes", "no"], answer: "maybe" },
    { options: ["yes", "yes"], answer: "yes" },
  ]) {
    assert.throws(() => evaluateActivityEvidence({ ...choice, content }, { selected: "yes" }),
      (error: unknown) => error instanceof EvidencePolicyError && error.status === 409);
  }
  for (const response of [null, [], {}, { selected: "maybe" }, { viewed: true }, { selected: 1 }]) {
    assert.throws(() => evaluateActivityEvidence(choice, response), EvidencePolicyError);
  }
});

test("a published sequence requires an explicit answer order", () => {
  const sorting = { activityType: "sorting", content: { sequence: ["a", "b"], answerSequence: ["b", "a"] }, maxScore: 2 };
  assert.equal(evaluateActivityEvidence(sorting, { sequence: ["a", "b"], correct: true }).level, "PRACTICED");
  assert.equal(evaluateActivityEvidence(sorting, { sequence: ["b", "a"] }).score, 2);
  assert.throws(() => evaluateActivityEvidence({ ...sorting, content: { sequence: ["a", "b"] } }, { sequence: ["a", "b"] }), EvidencePolicyError);
  assert.throws(() => evaluateActivityEvidence(sorting, { sequence: ["a", "a"] }), EvidencePolicyError);
});

test("an open answer records practice; a self-check records self-report, neither demonstrates mastery", () => {
  const speaking = { activityType: "speaking_model", content: { model: "Hello!" }, maxScore: 1 };
  const attempt = evaluateActivityEvidence(speaking, { text: "Hello", score: 999, completed: true });
  assert.equal(attempt.level, "PRACTICED");
  assert.equal(attempt.score, 0);
  assert.equal(attempt.completionStatus, "submitted");
  const selfCheck = evaluateActivityEvidence(speaking, { viewed: true, correct: true });
  assert.equal(selfCheck.level, "SELF_REPORTED");
  assert.equal(selfCheck.score, 0);
  assert.throws(() => evaluateActivityEvidence(speaking, { text: "  " }), EvidencePolicyError);
  assert.throws(() => evaluateActivityEvidence(speaking, { text: "x".repeat(4001) }), EvidencePolicyError);
});


test("matching is scored from the server-owned pair map", () => {
  const matching = {
    activityType: "matching",
    content: {
      pairs: [
        { left: "doctor", right: "hospital" },
        { left: "teacher", right: "school" },
      ],
    },
    maxScore: 2,
  };
  const wrong = evaluateActivityEvidence(matching, {
    matches: [
      { left: "doctor", right: "school" },
      { left: "teacher", right: "hospital" },
    ],
  });
  assert.equal(wrong.level, "PRACTICED");
  assert.equal(wrong.score, 0);

  const correct = evaluateActivityEvidence(matching, {
    matches: [
      { left: "teacher", right: "school" },
      { left: "doctor", right: "hospital" },
    ],
  });
  assert.equal(correct.level, "DEMONSTRATED");
  assert.equal(correct.score, 2);

  assert.throws(
    () => evaluateActivityEvidence(matching, { matches: [{ left: "doctor", right: "hospital" }] }),
    EvidencePolicyError,
  );
});
