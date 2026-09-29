export const RISKY_FEATURE_ENV = {
  timedAssessments: "CCJ_FEATURE_TIMED_ASSESSMENTS",
  learningWriteQuotas: "CCJ_FEATURE_LEARNING_WRITE_QUOTAS",
  offlineOutbox: "CCJ_FEATURE_OFFLINE_OUTBOX",
  integrationJobExecution: "CCJ_FEATURE_INTEGRATION_JOB_EXECUTION",
  guardianReporting: "CCJ_FEATURE_GUARDIAN_REPORTING",
} as const;

export type RiskyFeature = keyof typeof RISKY_FEATURE_ENV;

export function parseFeatureFlag(value: string | undefined | null) {
  return String(value || "").trim().toLowerCase() === "true";
}

export function isRiskyFeatureEnabled(feature: RiskyFeature) {
  return parseFeatureFlag(process.env[RISKY_FEATURE_ENV[feature]]);
}

export function riskyFeatureSnapshot() {
  return {
    timedAssessments: isRiskyFeatureEnabled("timedAssessments"),
    learningWriteQuotas: isRiskyFeatureEnabled("learningWriteQuotas"),
    offlineOutbox: isRiskyFeatureEnabled("offlineOutbox"),
    integrationJobExecution: isRiskyFeatureEnabled("integrationJobExecution"),
    guardianReporting: isRiskyFeatureEnabled("guardianReporting"),
  };
}
