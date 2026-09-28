import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeQaStatus,
  qaApprovalAllowed,
  qaContractChecks,
} from "../lib/qa/curriculum-qa-policy";

test("only supported QA states are accepted", () => {
  assert.equal(normalizeQaStatus("approved"), "approved");
  assert.equal(normalizeQaStatus("needs_changes"), "needs_changes");
  assert.equal(normalizeQaStatus("published"), null);
});

test("objective activity cannot be QA-approved without an answer definition", () => {
  const checks = qaContractChecks({
    activityId: "a",
    activityCode: "A01",
    contentVersion: 1,
    ageBand: "7-12",
    englishLevel: "A1",
    learningObjective: { en: "Choose the correct answer." },
    instructions: { en: "Choose one." },
    answerDefinition: null,
    feedbackRules: {},
    completionRule: {},
    evidencePolicy: {},
  });
  assert.equal(qaApprovalAllowed(checks, true), false);
});

test("complete practice activity may be approved without an answer key", () => {
  const checks = qaContractChecks({
    activityId: "a",
    activityCode: "A01",
    contentVersion: 1,
    ageBand: "7-12",
    englishLevel: "A1",
    learningObjective: { en: "Practice the sentence." },
    instructions: { en: "Say it aloud." },
    answerDefinition: null,
    feedbackRules: {},
    completionRule: {},
    evidencePolicy: {},
  });
  assert.equal(qaApprovalAllowed(checks, false), true);
});
