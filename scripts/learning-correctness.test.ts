import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { beginnerObjectives, beginnerPublicActivities, evaluateBeginnerSubmission } from "../lib/learning/beginner-objectives";
import { EvaluationError, evaluateObjective, type ObjectiveActivity } from "../lib/learning/objective-evaluation";
import { readBoundedJson } from "../lib/learning/request-json";

// Independent expectations transcribed from the bilingual source, not copied from evaluator output.
const expectedKeys: Record<number, string> = {
  1: "B", 4: "A", 7: "B", 10: "A", 13: "B", 16: "A", 19: "B", 22: "A",
  25: "B", 28: "A", 31: "B", 34: "A", 37: "B", 40: "A", 43: "B", 46: "A",
  49: "B", 52: "A", 55: "B", 58: "A", 61: "B", 64: "A", 67: "B", 70: "A",
  73: "B", 76: "A", 79: "B", 82: "A", 85: "B", 88: "A", 91: "B",
};
function submission(activity: ObjectiveActivity, answer: string) {
  return { activityId: activity.activityId, activityVersion: activity.activityVersion, selectedAnswerId: answer, submissionId: randomUUID() };
}
function fails(value: unknown, status: number) {
  assert.throws(() => evaluateBeginnerSubmission(value), (error: unknown) => error instanceof EvaluationError && error.status === status);
}

test("Every authored Beginner A/B exercise has exactly one versioned definition with a source-aligned key", () => {
  const html = readFileSync("content/interactive-books/career-compass-junior.html", "utf8");
  const lessons = JSON.parse(html.match(/<script id="lessons-data" type="application\/json">(.*?)<\/script>/s)![1]) as Array<{lesson: number; quickTry: string; vocab: Array<{en: string; vn: string}>}>;
  const authored = lessons.filter((lesson) => /A\.\s*.+?\s*\/\s*B\./.test(lesson.quickTry));
  assert.equal(authored.length, 31);
  assert.equal(beginnerObjectives.length, authored.length);
  assert.equal(new Set(beginnerObjectives.map((activity) => activity.activityId)).size, 31);
  for (const lesson of authored) {
    const activity = beginnerObjectives.find((item) => item.lessonId === `L${String(lesson.lesson).padStart(2, "0")}`)!;
    assert.ok(activity, `Missing lesson ${lesson.lesson}`);
    assert.equal(activity.correctAnswerId, expectedKeys[lesson.lesson]);
    const word = lesson.quickTry.match(/“(.*?)”/)![1];
    const meaning = lesson.vocab.find((item) => item.en === word)!.vn;
    assert.equal(activity.options.find((option) => option.id === expectedKeys[lesson.lesson])!.label, meaning);
  }
});

for (const activity of beginnerObjectives) {
  test(`${activity.lessonId}: incorrect, repeated incorrect, retry, correct, duplicate and reload are deterministic`, () => {
    const key = expectedKeys[Number(activity.lessonId.slice(1))];
    const wrong = submission(activity, key === "A" ? "B" : "A");
    const correct = submission(activity, key);
    const first = evaluateBeginnerSubmission(wrong);
    assert.equal(first.outcome, "incorrect");
    assert.equal(first.criterionMet, false);
    assert.equal(first.score, 0);
    assert.equal(first.retryAllowed, true);
    assert.deepEqual(evaluateBeginnerSubmission(wrong), first, "Duplicate must retain its incorrect result");
    assert.equal(evaluateBeginnerSubmission({ ...wrong, submissionId: randomUUID() }).outcome, "incorrect");
    const retry = evaluateBeginnerSubmission(correct);
    assert.equal(retry.outcome, "correct");
    assert.equal(retry.criterionMet, true);
    assert.deepEqual(evaluateBeginnerSubmission(correct), retry);
    // A prior correct answer / page reconstruction cannot contaminate later wrong answers.
    assert.equal(evaluateBeginnerSubmission(JSON.parse(JSON.stringify(wrong))).outcome, "incorrect");
    fails({ ...correct, selectedAnswerId: "C" }, 400);
    fails({ ...correct, selectedAnswerId: null }, 400);
    fails({ ...correct, activityVersion: activity.activityVersion + 1 }, 409);
    fails({ ...correct, correct: true, score: 1 }, 400);
  });
}

test("Regression: selecting tạm biệt for hello can NEVER produce a success result", () => {
  const hello = beginnerObjectives.find((item) => item.lessonId === "L01")!;
  const result = evaluateBeginnerSubmission(submission(hello, "A"));
  assert.equal(result.outcome, "incorrect");
  assert.equal(result.criterionMet, false);
  assert.equal(result.feedback.vi, hello.feedback.incorrect.vi);
  assert.notEqual(result.feedback.vi, hello.feedback.correct.vi);
});

test("Missing/invalid keys fail closed, including both options and missing feedback", () => {
  const original = beginnerObjectives[0];
  for (const change of [
    { correctAnswerId: undefined }, { correctAnswerId: "" }, { correctAnswerId: "C" },
    { options: [{ id: "A", label: "same" }, { id: "A", label: "other" }] },
    { options: [{ id: "A", label: "same" }, { id: "B", label: "same" }] },
    { feedback: undefined }, { completionRule: { type: "viewed" } },
  ]) {
    for (const answer of ["A", "B"]) {
      assert.throws(() => evaluateObjective({ ...original, ...change } as ObjectiveActivity, submission(original, answer)), EvaluationError);
    }
  }
});

test("Malformed submission cannot be successful", () => {
  for (const value of [null, [], {}, true, "A", 1, { selectedAnswerId: "A" }]) fails(value, 400);
  fails({ ...submission(beginnerObjectives[0], "A"), activityId: "unknown" }, 404);
});

test("Public book definitions contain no authoritative answer keys", () => {
  for (const activity of beginnerPublicActivities()) {
    assert.equal("correctAnswerId" in activity, false);
    assert.equal("feedback" in activity, false);
  }
});

test("Bounded request parser rejects oversized streamed content and malformed JSON", async () => {
  const request = (body: string) => new Request("http://localhost/api/learning/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body });
  await assert.rejects(() => readBoundedJson(request('"' + "a".repeat(8192) + '"')), (error: unknown) => error instanceof EvaluationError && error.status === 413);
  await assert.rejects(() => readBoundedJson(request("{")), EvaluationError);
  assert.equal(await readBoundedJson(request("null")), null);
});
