/** The database activity definition is authoritative; client scores and completion flags are ignored. */
export type EvidenceLevel = "PRACTICED" | "SELF_REPORTED" | "DEMONSTRATED";

export type EvidenceDecision = {
  level: EvidenceLevel;
  result: "correct" | "incorrect" | "recorded";
  score: number;
  completionStatus: "submitted" | "completed";
  completionRule: string;
  evidencePolicy: string;
  feedback: { en: string; vi: string };
};

export class EvidencePolicyError extends Error {
  constructor(public readonly code: string, public readonly status: 400 | 409 = 400) {
    super(code);
  }
}

type ActivityDefinition = {
  activityType: string;
  content: unknown;
  maxScore: unknown;
};

function strings(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 30 ||
      !value.every((item) => typeof item === "string" && item.length > 0 && item.length <= 300) ||
      new Set(value).size !== value.length) return null;
  return value;
}

const recorded = (level: "PRACTICED" | "SELF_REPORTED", evidencePolicy: string): EvidenceDecision => ({
  level, result: "recorded", score: 0, completionStatus: "submitted",
  completionRule: "Requires objective criterion or reviewed rubric for demonstrated learning",
  evidencePolicy,
  feedback: level === "SELF_REPORTED"
    ? { en: "Self-check recorded. This does not verify mastery.", vi: "Đã ghi nhận tự đánh giá. Điều này chưa xác nhận em đã nắm vững." }
    : { en: "Practice recorded. Feedback or a review is needed to demonstrate learning.", vi: "Đã ghi nhận luyện tập. Cần phản hồi hoặc đánh giá để chứng minh kết quả học tập." },
});

function objective(correct: boolean, maxScore: unknown): EvidenceDecision {
  const publishedScore = typeof maxScore === "number" || typeof maxScore === "string" ? Number(maxScore) : NaN;
  const limit = Number.isFinite(publishedScore) && publishedScore > 0 ? publishedScore : 1;
  return {
    level: correct ? "DEMONSTRATED" : "PRACTICED",
    result: correct ? "correct" : "incorrect", score: correct ? limit : 0,
    completionStatus: correct ? "completed" : "submitted",
    completionRule: "Correct answer to the published objective activity",
    evidencePolicy: "Server-evaluated answer against the published answer key",
    feedback: correct
      ? { en: "Correct. You demonstrated this objective.", vi: "Đúng rồi. Em đã thể hiện được mục tiêu học tập này." }
      : { en: "Not yet. Try again.", vi: "Chưa đúng. Hãy thử lại nhé." },
  };
}

export function evaluateActivityEvidence(activity: ActivityDefinition, submitted: unknown): EvidenceDecision {
  if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) {
    throw new EvidencePolicyError("invalid_response");
  }
  const response = submitted as Record<string, unknown>;
  const content = activity.content && typeof activity.content === "object" && !Array.isArray(activity.content)
    ? activity.content as Record<string, unknown> : {};

  if ("options" in content || activity.activityType === "multiple_choice") {
    const options = strings(content.options);
    if (!options || typeof content.answer !== "string" || !options.includes(content.answer)) {
      throw new EvidencePolicyError("missing_or_invalid_answer_key", 409);
    }
    if (typeof response.selected !== "string" || !options.includes(response.selected)) {
      throw new EvidencePolicyError("invalid_selected_option");
    }
    return objective(response.selected === content.answer, activity.maxScore);
  }

  if ("sequence" in content || activity.activityType === "sorting") {
    const sequence = strings(content.sequence);
    const key = strings(content.answerSequence);
    if (!sequence || !key || sequence.length !== key.length || key.some((value) => !sequence.includes(value))) {
      throw new EvidencePolicyError("missing_or_invalid_answer_key", 409);
    }
    const attempt = response.sequence;
    if (!Array.isArray(attempt) || attempt.length !== key.length ||
        attempt.some((value) => typeof value !== "string" || !sequence.includes(value)) ||
        new Set(attempt).size !== key.length) {
      throw new EvidencePolicyError("invalid_sequence");
    }
    return objective(key.every((value, index) => attempt[index] === value), activity.maxScore);
  }

  if (activity.activityType === "matching" || "pairs" in content) {
    if (!Array.isArray(content.pairs) || content.pairs.length < 2 || content.pairs.length > 30) {
      throw new EvidencePolicyError("missing_or_invalid_answer_key", 409);
    }
    const key = content.pairs.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const pair = item as Record<string, unknown>;
      const left = typeof pair.left === "string" ? pair.left.trim() : "";
      const right = typeof pair.right === "string" ? pair.right.trim() : "";
      return left && right ? { left, right } : null;
    });
    if (
      key.some((item) => item === null) ||
      new Set(key.map((item) => item?.left)).size !== key.length ||
      new Set(key.map((item) => item?.right)).size !== key.length
    ) {
      throw new EvidencePolicyError("missing_or_invalid_answer_key", 409);
    }

    const attempt = response.matches;
    if (!Array.isArray(attempt) || attempt.length !== key.length) {
      throw new EvidencePolicyError("invalid_matching_response");
    }
    const submitted = attempt.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const pair = item as Record<string, unknown>;
      return typeof pair.left === "string" && typeof pair.right === "string"
        ? { left: pair.left.trim(), right: pair.right.trim() }
        : null;
    });
    if (
      submitted.some((item) => item === null) ||
      new Set(submitted.map((item) => item?.left)).size !== submitted.length
    ) {
      throw new EvidencePolicyError("invalid_matching_response");
    }

    const answerMap = new Map((key as Array<{ left: string; right: string }>).map((item) => [item.left, item.right]));
    const correct = (submitted as Array<{ left: string; right: string }>).every(
      (item) => answerMap.get(item.left) === item.right,
    );
    return objective(correct, activity.maxScore);
  }

  if (typeof response.text === "string" && response.text.trim().length > 0 && response.text.length <= 4000) {
    return recorded("PRACTICED", "Learner response retained for rubric or teacher review; no automatic mastery");
  }
  if (response.viewed === true || response.selfReported === true) {
    return recorded("SELF_REPORTED", "Learner self-report only; no objective or reviewed evidence");
  }
  throw new EvidencePolicyError("invalid_response");
}
