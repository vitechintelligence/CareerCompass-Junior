export type CurriculumQaStatus = "unreviewed" | "in_review" | "approved" | "needs_changes";

const QA_STATUSES = new Set<CurriculumQaStatus>([
  "unreviewed",
  "in_review",
  "approved",
  "needs_changes",
]);

export function normalizeQaStatus(value: unknown): CurriculumQaStatus | null {
  return typeof value === "string" && QA_STATUSES.has(value as CurriculumQaStatus)
    ? value as CurriculumQaStatus
    : null;
}

export type QaContractCompletenessInput = {
  activityId?: unknown;
  activityCode?: unknown;
  contentVersion?: unknown;
  ageBand?: unknown;
  englishLevel?: unknown;
  learningObjective?: { en?: unknown; vi?: unknown } | null;
  instructions?: { en?: unknown; vi?: unknown } | null;
  answerDefinition?: unknown;
  feedbackRules?: unknown;
  completionRule?: unknown;
  evidencePolicy?: unknown;
};

export function qaContractChecks(input: QaContractCompletenessInput) {
  return {
    activityId: typeof input.activityId === "string" && input.activityId.length > 0,
    activityCode: typeof input.activityCode === "string" && input.activityCode.length > 0,
    contentVersion: Number.isSafeInteger(input.contentVersion) && Number(input.contentVersion) >= 1,
    languageContext: Boolean(
      input.instructions &&
      (typeof input.instructions.en === "string" || typeof input.instructions.vi === "string")
    ),
    objective: Boolean(
      input.learningObjective &&
      (typeof input.learningObjective.en === "string" || typeof input.learningObjective.vi === "string")
    ),
    ageBand: typeof input.ageBand === "string" && input.ageBand.length > 0,
    englishLevel: typeof input.englishLevel === "string" && input.englishLevel.length > 0,
    feedbackRules: Boolean(input.feedbackRules && typeof input.feedbackRules === "object"),
    completionRule: Boolean(input.completionRule && typeof input.completionRule === "object"),
    evidencePolicy: Boolean(input.evidencePolicy && typeof input.evidencePolicy === "object"),
    answerDefinitionPresent: input.answerDefinition != null,
  };
}

export function qaApprovalAllowed(checks: ReturnType<typeof qaContractChecks>, requiresAnswer: boolean) {
  const required = [
    checks.activityId,
    checks.activityCode,
    checks.contentVersion,
    checks.languageContext,
    checks.objective,
    checks.ageBand,
    checks.englishLevel,
    checks.feedbackRules,
    checks.completionRule,
    checks.evidencePolicy,
  ];
  if (requiresAnswer) required.push(checks.answerDefinitionPresent);
  return required.every(Boolean);
}
