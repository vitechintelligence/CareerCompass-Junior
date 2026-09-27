import { createHash } from "node:crypto";

export const ACTIVITY_CONTRACT_VERSION = 1 as const;

export type ActivityInputType =
  | "single_choice"
  | "sequence"
  | "matching"
  | "text"
  | "speaking_text"
  | "practice_acknowledgement"
  | "self_report"
  | "structured";

export type ActivityContractV1 = {
  contractVersion: 1;
  activityId: string;
  activityCode: string;
  courseId: string;
  unitId: string;
  lessonId: string;
  activityType: string;
  contentVersion: number;
  language: "en-vi";
  ageBand: string | null;
  englishLevel: string | null;
  learningObjective: { en: string | null; vi: string | null };
  instructions: { en: string | null; vi: string | null };
  inputType: ActivityInputType;
  answerDefinition: Record<string, unknown> | null;
  rubricDefinition: Record<string, unknown> | null;
  feedbackRules: Record<string, unknown>;
  completionRule: Record<string, unknown>;
  evidencePolicy: Record<string, unknown>;
  content: Record<string, unknown>;
};

export type ActivityLaunchContractV1 = {
  contractVersion: 1;
  assignedEnrollmentId: string | null;
  activity: Omit<ActivityContractV1, "answerDefinition">;
};

export class ActivityContractError extends Error {
  constructor(public readonly code: string, public readonly status: 400 | 409 = 400) {
    super(code);
  }
}

type BuildInput = {
  activityId: string;
  activityCode: string;
  courseId: string;
  unitId: string;
  activityType: string;
  contentVersion: number;
  ageBand: string | null;
  englishLevel: string | null;
  objectiveEn: string | null;
  objectiveVi: string | null;
  instructionsEn: string | null;
  instructionsVi: string | null;
  content: unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function learnerContent(value: Record<string, unknown>) {
  const {
    answer: _answer,
    answerSequence: _answerSequence,
    correctAnswerId: _correctAnswerId,
    ...visible
  } = value;
  void _answer;
  void _answerSequence;
  void _correctAnswerId;
  return visible;
}

function inputType(activityType: string, content: Record<string, unknown>): ActivityInputType {
  if (Array.isArray(content.options)) return "single_choice";
  if (Array.isArray(content.sequence)) return "sequence";
  if (activityType === "matching") return "matching";
  if (activityType === "speaking_model") return "speaking_text";
  if (["writing", "reflection", "project", "teacher_check"].includes(activityType)) return "text";
  if (activityType === "look_listen_say" || activityType === "resource") return "practice_acknowledgement";
  if (activityType === "self_check") return "self_report";
  return "structured";
}

function answerDefinition(content: Record<string, unknown>) {
  if (Array.isArray(content.options) && typeof content.answer === "string") {
    return { type: "single_choice", correctValue: content.answer };
  }
  if (Array.isArray(content.sequence) && Array.isArray(content.answerSequence)) {
    return { type: "sequence", correctSequence: content.answerSequence };
  }
  if (typeof content.correctAnswerId === "string") {
    return { type: "single_choice_id", correctAnswerId: content.correctAnswerId };
  }
  return null;
}

function rubricDefinition(activityType: string, type: ActivityInputType) {
  if (type === "text" || type === "speaking_text" || activityType === "project") {
    return {
      type: "teacher_review",
      requiredForDemonstrated: true,
      requiredForVerified: true,
    };
  }
  return null;
}

function completionRuleFor(type: ActivityInputType, answer: Record<string, unknown> | null) {
  if (answer) return { type: "objective_criterion", criterion: "server_evaluated_correct" };
  if (type === "text" || type === "speaking_text") {
    return { type: "review_required", practicedOnSubmission: true };
  }
  return { type: "practice_recorded", demonstrated: false };
}

function evidencePolicyFor(type: ActivityInputType, answer: Record<string, unknown> | null) {
  if (answer) {
    return {
      practiced: "attempt_submitted",
      demonstrated: "objective_criterion_met",
      verified: "not_automatic",
    };
  }
  if (type === "text" || type === "speaking_text") {
    return {
      practiced: "response_submitted",
      demonstrated: "rubric_criterion_met",
      verified: "teacher_approval",
    };
  }
  return {
    practiced: "participation_recorded",
    demonstrated: "not_automatic",
    verified: "not_automatic",
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableJson(obj[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function buildActivityContract(input: BuildInput): ActivityContractV1 {
  if (!input.activityId || !input.activityCode || !input.courseId || !input.unitId ||
      !Number.isSafeInteger(input.contentVersion) || input.contentVersion < 1) {
    throw new ActivityContractError("activity_contract_invalid", 409);
  }

  const rawContent = record(input.content);
  const type = inputType(input.activityType, rawContent);
  const answer = answerDefinition(rawContent);
  const explicitLesson = rawContent.lessonId;
  const lessonId = typeof explicitLesson === "number" && Number.isSafeInteger(explicitLesson)
    ? `L${String(explicitLesson).padStart(2, "0")}`
    : typeof explicitLesson === "string" && explicitLesson.trim()
      ? explicitLesson.trim().slice(0, 80)
      : input.activityCode;

  return {
    contractVersion: ACTIVITY_CONTRACT_VERSION,
    activityId: input.activityId,
    activityCode: input.activityCode,
    courseId: input.courseId,
    unitId: input.unitId,
    lessonId,
    activityType: input.activityType,
    contentVersion: input.contentVersion,
    language: "en-vi",
    ageBand: input.ageBand,
    englishLevel: input.englishLevel,
    learningObjective: { en: input.objectiveEn, vi: input.objectiveVi },
    instructions: { en: input.instructionsEn, vi: input.instructionsVi },
    inputType: type,
    answerDefinition: answer,
    rubricDefinition: rubricDefinition(input.activityType, type),
    feedbackRules: answer
      ? {
          correct: { en: "Correct. You demonstrated this objective.", vi: "Đúng rồi. Em đã thể hiện được mục tiêu học tập này." },
          incorrect: { en: "Not yet. Try again.", vi: "Chưa đúng. Hãy thử lại nhé." },
          retry: "allowed",
        }
      : {
          practiced: { en: "Practice recorded.", vi: "Đã ghi nhận luyện tập." },
          reviewRequired: type === "text" || type === "speaking_text",
        },
    completionRule: completionRuleFor(type, answer),
    evidencePolicy: evidencePolicyFor(type, answer),
    content: learnerContent(rawContent),
  };
}

export function activityContractHash(contract: ActivityContractV1) {
  return createHash("sha256").update(stableJson(contract), "utf8").digest("hex");
}

export function learnerActivityContract(
  contract: ActivityContractV1,
  assignedEnrollmentId: string | null,
): ActivityLaunchContractV1 {
  const { answerDefinition: _answerDefinition, ...safe } = contract;
  void _answerDefinition;
  return {
    contractVersion: ACTIVITY_CONTRACT_VERSION,
    assignedEnrollmentId,
    activity: safe,
  };
}

export function requireActivityContentVersion(requested: unknown, current: number) {
  if (requested == null) return current;
  if (!Number.isSafeInteger(requested) || Number(requested) < 1) {
    throw new ActivityContractError("invalid_content_version");
  }
  if (Number(requested) !== current) {
    throw new ActivityContractError("content_version_mismatch", 409);
  }
  return current;
}
