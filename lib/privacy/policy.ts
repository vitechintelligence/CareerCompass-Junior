export const PRIVACY_POLICY_VERSION = "VN-2026-10-01-v1";
export const OPTIONAL_PURPOSES = ["ai_assistive_features", "guardian_reporting", "community_showcase", "industry_network", "capsule_exchange"] as const;
export type OptionalPurpose = typeof OPTIONAL_PURPOSES[number];
export const DEPLOYMENT_MODES = ["vitech_managed_cloud", "hybrid_institution", "capsule_private", "institution_hosted_future"] as const;
export type DeploymentMode = typeof DEPLOYMENT_MODES[number];
export function isOptionalPurpose(value: unknown): value is OptionalPurpose {
  return typeof value === "string" && (OPTIONAL_PURPOSES as readonly string[]).includes(value);
}
export function learnerOnboardingApproved(env: NodeJS.ProcessEnv = process.env) {
  return env.CCJ_REAL_LEARNER_ONBOARDING_ENABLED === "true" && env.CCJ_CHILD_DATA_GOVERNANCE_APPROVED === "true";
}
export function sourceRetentionSeconds(days: number) {
  return Math.max(86400, Math.min(30 * 86400, Number.isFinite(days) ? Math.trunc(days) * 86400 : 86400));
}
export const PURPOSE_LABELS: Record<OptionalPurpose, string> = {
  ai_assistive_features: "Think Beyond / Professor Vi — optional AI / AI tùy chọn",
  guardian_reporting: "Named representative reports / Báo cáo cho người đại diện đã xác minh",
  community_showcase: "Reviewed community sharing / Chia sẻ cộng đồng có kiểm duyệt",
  industry_network: "Age-restricted industry connection / Kết nối nghề nghiệp theo độ tuổi",
  capsule_exchange: "Institution-approved Capsule exchange / Trao đổi Capsule được cơ sở phê duyệt",
};
