/** Pure authoritative evaluation. Call with a server-owned definition, never client content. */
export type ObjectiveActivity = {
  activityId: string;
  activityVersion: number;
  courseId: string;
  unitId: string;
  lessonId: string;
  activityType: string;
  language: string;
  ageBand: string;
  englishLevel: string;
  objective: { en: string; vi: string };
  question: string;
  options: Array<{ id: string; label: string }>;
  correctAnswerId: string;
  feedback: {
    correct: { en: string; vi: string };
    incorrect: { en: string; vi: string };
  };
  retryPolicy: { mode: string; retainAttempts: boolean };
  completionRule: { type: string };
  evidencePolicy: { type: string; verification: string };
};

export class EvaluationError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export type ObjectiveSubmission = {
  activityId: string;
  activityVersion: number;
  selectedAnswerId: string;
  submissionId: string;
};

export function parseObjectiveSubmission(value: unknown): ObjectiveSubmission {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EvaluationError("invalid_submission", 400);
  }
  const input = value as Record<string, unknown>;
  const keys = ["activityId", "activityVersion", "selectedAnswerId", "submissionId"];
  if (Object.keys(input).some((key) => !keys.includes(key)) ||
      typeof input.activityId !== "string" || !/^[A-Za-z0-9._-]{1,120}$/.test(input.activityId) ||
      !Number.isSafeInteger(input.activityVersion) || Number(input.activityVersion) < 1 ||
      typeof input.selectedAnswerId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(input.selectedAnswerId) ||
      typeof input.submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId)) {
    throw new EvaluationError("invalid_submission", 400);
  }
  return input as ObjectiveSubmission;
}

export function validateObjectiveDefinition(activity: ObjectiveActivity): void {
  const options = activity.options;
  if (activity.activityType !== "single_choice" || !Array.isArray(options) || options.length < 2 ||
      options.some((option) => !option || typeof option.id !== "string" || !option.id || !option.label) ||
      new Set(options.map((option) => option.id)).size !== options.length ||
      new Set(options.map((option) => option.label.trim())).size !== options.length ||
      typeof activity.correctAnswerId !== "string" || !activity.correctAnswerId ||
      options.filter((option) => option.id === activity.correctAnswerId).length !== 1 ||
      !activity.feedback?.correct?.en || !activity.feedback?.correct?.vi ||
      !activity.feedback?.incorrect?.en || !activity.feedback?.incorrect?.vi ||
      activity.completionRule?.type !== "correct_answer" ||
      activity.evidencePolicy?.type !== "objective_result" ||
      activity.retryPolicy?.mode !== "unlimited") {
    throw new EvaluationError("activity_not_ready", 422);
  }
}

export function evaluateObjective(activity: ObjectiveActivity, submission: ObjectiveSubmission) {
  validateObjectiveDefinition(activity);
  // Validate again for internal callers: typed objects can still originate from untrusted JSON.
  const input = parseObjectiveSubmission(submission);
  if (input.activityId !== activity.activityId) throw new EvaluationError("activity_not_found", 404);
  if (input.activityVersion !== activity.activityVersion) throw new EvaluationError("content_version_mismatch", 409);
  if (!activity.options.some((option) => option.id === input.selectedAnswerId)) {
    throw new EvaluationError("unknown_answer", 400);
  }
  const correct = input.selectedAnswerId === activity.correctAnswerId;
  return {
    activityId: activity.activityId,
    activityVersion: activity.activityVersion,
    submissionId: input.submissionId,
    selectedAnswerId: input.selectedAnswerId,
    outcome: correct ? "correct" as const : "incorrect" as const,
    score: correct ? 1 : 0,
    criterionMet: correct,
    feedback: correct ? activity.feedback.correct : activity.feedback.incorrect,
    retryAllowed: true,
    evaluationType: "deterministic" as const,
  };
}
