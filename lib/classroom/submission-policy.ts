export type SubmissionStatus = "draft" | "submitted" | "returned" | "accepted";

export function learnerCanEditSubmission(status: SubmissionStatus | null) {
  return status === null || status === "draft" || status === "returned";
}

export function learnerCanSubmitRevision(status: SubmissionStatus | null) {
  return learnerCanEditSubmission(status);
}

export function teacherCanReviewSubmission(status: SubmissionStatus) {
  return status === "submitted";
}

export function reviewDecisionStatus(decision: "return" | "verify"): SubmissionStatus {
  return decision === "verify" ? "accepted" : "returned";
}

export function assignmentAttentionBucket(input: {
  submissionStatus: SubmissionStatus | null;
  dueAt: Date | null;
  now: Date;
}) {
  if (input.submissionStatus === "submitted") return "pending_review";
  if (input.submissionStatus === "returned") return "learner_retry";
  if (
    input.dueAt &&
    input.dueAt.getTime() < input.now.getTime() &&
    input.submissionStatus !== "accepted"
  ) return "overdue";
  return "none";
}
