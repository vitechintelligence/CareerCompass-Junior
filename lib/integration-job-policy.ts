export type IntegrationJobFailureState = {
  status: "retry" | "dead_letter";
  retryAfterSeconds: number | null;
};

export function integrationRetryDelaySeconds(attemptCount: number) {
  const attempt = Math.max(1, Math.floor(attemptCount));
  return Math.min(900, 30 * (2 ** (attempt - 1)));
}

export function integrationFailureState(attemptCount: number, maxAttempts: number): IntegrationJobFailureState {
  const attempts = Math.max(1, Math.floor(attemptCount));
  const max = Math.max(1, Math.floor(maxAttempts));
  if (attempts >= max) return { status: "dead_letter", retryAfterSeconds: null };
  return { status: "retry", retryAfterSeconds: integrationRetryDelaySeconds(attempts) };
}

export function integrationJobRunnable(status: string, nextAttemptAt: Date | null, now: Date) {
  if (!["queued", "retry"].includes(status)) return false;
  return !nextAttemptAt || nextAttemptAt.getTime() <= now.getTime();
}
