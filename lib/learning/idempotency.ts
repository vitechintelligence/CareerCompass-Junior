const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeSubmissionId(value: unknown) {
  return typeof value === "string" && UUID_V4_RE.test(value) ? value.toLowerCase() : null;
}

export function unitLessonSubmissionStorageKey(namespace: string, lessonId: number) {
  const safeNamespace = namespace.trim().replace(/[^A-Za-z0-9:_-]/g, "_").slice(0, 160);
  if (!safeNamespace) throw new Error("submission_namespace_required");
  if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > 1000) {
    throw new Error("submission_lesson_invalid");
  }
  return `ccj-unit1:${safeNamespace}:submission:${lessonId}`;
}

export type PendingSubmission = {
  signature: string;
  submissionId: string;
};

export function reuseOrCreateSubmission(
  pending: PendingSubmission | null,
  signature: string,
  createId: () => string,
): PendingSubmission {
  if (pending?.signature === signature && normalizeSubmissionId(pending.submissionId)) {
    return pending;
  }
  const created = normalizeSubmissionId(createId());
  if (!created) throw new Error("submission_id_generation_failed");
  return { signature, submissionId: created };
}
