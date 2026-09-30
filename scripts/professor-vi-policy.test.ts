import test from "node:test";
import assert from "node:assert/strict";
import { decideProfessorViMove, normalizeLearnerState } from "../lib/professor-vi/protocol";

const institution = {
  allowedModes: ["summary","study_guide","quiz","socratic","math_science"],
  answerReleaseStrictness: "guided" as const,
  teacherReviewRequired: true,
  primaryLanguage: "vi",
  cefrTarget: "B1",
  interventionIntensity: "adaptive" as const,
};

test("Professor Vi requires a learner attempt before revealing", () => {
  const learner = normalizeLearnerState({ lessonMode: "ai", attemptCount: 0 });
  const decision = decideProfessorViMove({ learner, institution, taskRequiresAttempt: true });
  assert.equal(decision.state, "ASK");
  assert.equal(decision.reason, "learner_attempt_required");
  assert.equal(decision.allowedActions.includes("invite_attempt"), true);
});

test("Professor Vi escalates support progressively after repeated failure", () => {
  const hint = decideProfessorViMove({
    learner: normalizeLearnerState({ lessonMode: "math_science", attemptCount: 2, repeatedFailure: 1 }),
    institution,
  });
  assert.equal(hint.state, "HINT");

  const scaffold = decideProfessorViMove({
    learner: normalizeLearnerState({ lessonMode: "math_science", attemptCount: 5, repeatedFailure: 4 }),
    institution,
  });
  assert.equal(scaffold.state, "SCAFFOLD");

  const explain = decideProfessorViMove({
    learner: normalizeLearnerState({ lessonMode: "math_science", attemptCount: 7, repeatedFailure: 6 }),
    institution,
  });
  assert.equal(explain.state, "EXPLAIN");
});

test("Strong evidence reduces scaffolding and asks for transfer", () => {
  const learner = normalizeLearnerState({ lessonMode: "steam", masteryEvidence: "strong", attemptCount: 3 });
  const decision = decideProfessorViMove({ learner, institution });
  assert.equal(decision.state, "TRANSFER");
});

test("Safety concerns override tutoring progression", () => {
  const learner = normalizeLearnerState({ lessonMode: "ai", attemptCount: 4 });
  const decision = decideProfessorViMove({ learner, institution, safetyRisk: true });
  assert.equal(decision.shouldEscalate, true);
  assert.equal(decision.reason, "safeguarding_escalation");
});
