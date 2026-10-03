export const LEARNING_WRITE_LIMITS = {
  learnerMinute: 30,
  learnerDay: 1000,
  organizationMinute: 600,
  organizationDay: 20000,
} as const;

export function quotaScopeKeys(profileId: string, organizationId?: string | null) {
  const learner = organizationId
    ? `learner:${profileId}:org:${organizationId}`
    : `learner:${profileId}:personal`;
  return {
    learner,
    organization: organizationId ? `organization:${organizationId}` : null,
  };
}
