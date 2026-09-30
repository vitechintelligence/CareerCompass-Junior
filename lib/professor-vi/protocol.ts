export type ProfessorViTeachingState =
  | "ASK" | "REFRAME" | "HINT" | "SCAFFOLD" | "PARTIAL_MODEL"
  | "EXPLAIN" | "REVEAL" | "REFLECT" | "TRANSFER";

export type ProfessorViLessonMode =
  | "english" | "career" | "steam" | "ai" | "reflection" | "assessment" | "math_science";

export type ProfessorViLearnerState = {
  ageBand: string | null;
  cefr: string | null;
  primaryLanguage: string;
  lessonMode: ProfessorViLessonMode;
  promptDependence: number;
  reasoningDepth: number;
  scaffoldLevel: number;
  attemptCount: number;
  repeatedFailure: number;
  masteryEvidence: "unknown" | "emerging" | "strong";
  recentSuccess: string[];
  recentBarriers: string[];
};

export type ProfessorViInstitutionPolicy = {
  allowedModes: string[];
  answerReleaseStrictness: "guided" | "balanced" | "direct_when_stuck";
  teacherReviewRequired: boolean;
  primaryLanguage: string;
  cefrTarget: string | null;
  interventionIntensity: "light" | "adaptive" | "high_support";
};

export type ProfessorViDecision = {
  state: ProfessorViTeachingState;
  allowedActions: string[];
  shouldEscalate: boolean;
  reason: string;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function normalizeLearnerState(
  input: Partial<ProfessorViLearnerState> & Pick<ProfessorViLearnerState, "lessonMode">,
): ProfessorViLearnerState {
  return {
    ageBand: input.ageBand ?? null,
    cefr: input.cefr ?? null,
    primaryLanguage: input.primaryLanguage || "vi",
    lessonMode: input.lessonMode,
    promptDependence: clamp01(input.promptDependence ?? 0),
    reasoningDepth: clamp01(input.reasoningDepth ?? 0.5),
    scaffoldLevel: Math.max(0, Math.min(6, Math.trunc(input.scaffoldLevel ?? 0))),
    attemptCount: Math.max(0, Math.trunc(input.attemptCount ?? 0)),
    repeatedFailure: Math.max(0, Math.trunc(input.repeatedFailure ?? 0)),
    masteryEvidence: input.masteryEvidence ?? "unknown",
    recentSuccess: (input.recentSuccess ?? []).slice(-10),
    recentBarriers: (input.recentBarriers ?? []).slice(-10),
  };
}

export function decideProfessorViMove(input: {
  safetyRisk?: boolean;
  taskRequiresAttempt?: boolean;
  learner: ProfessorViLearnerState;
  institution: ProfessorViInstitutionPolicy;
}): ProfessorViDecision {
  const learner = input.learner;
  const institution = input.institution;

  if (input.safetyRisk) {
    return {
      state: "EXPLAIN",
      allowedActions: ["stop_task", "supportive_response", "escalate_to_adult"],
      shouldEscalate: true,
      reason: "safeguarding_escalation",
    };
  }

  if (input.taskRequiresAttempt && learner.attemptCount === 0) {
    return {
      state: "ASK",
      allowedActions: ["ask_one_question", "invite_attempt", "offer_clarification"],
      shouldEscalate: false,
      reason: "learner_attempt_required",
    };
  }

  if (learner.masteryEvidence === "strong") {
    return {
      state: "TRANSFER",
      allowedActions: ["application_question", "contrast", "justify", "create_alternative", "reflection"],
      shouldEscalate: false,
      reason: "reduce_scaffold_increase_transfer",
    };
  }

  const threshold =
    institution.answerReleaseStrictness === "direct_when_stuck" ? 2 :
    institution.answerReleaseStrictness === "balanced" ? 3 : 4;

  if (learner.repeatedFailure >= threshold + 2) {
    return {
      state: "EXPLAIN",
      allowedActions: ["worked_explanation", "check_understanding", "reflection"],
      shouldEscalate: false,
      reason: "continued_withholding_unproductive",
    };
  }
  if (learner.repeatedFailure >= threshold + 1) {
    return {
      state: "PARTIAL_MODEL",
      allowedActions: ["partial_model", "worked_first_step", "ask_next_step"],
      shouldEscalate: false,
      reason: "partial_model_after_repeated_failure",
    };
  }
  if (learner.repeatedFailure >= threshold) {
    return {
      state: "SCAFFOLD",
      allowedActions: ["break_into_steps", "provide_choices", "sentence_frame_if_beginner", "ask_one_question"],
      shouldEscalate: false,
      reason: "scaffold_after_repeated_failure",
    };
  }
  if (learner.repeatedFailure >= 1 || learner.promptDependence > 0.65) {
    return {
      state: "HINT",
      allowedActions: ["hint", "contrast", "point_to_source", "ask_one_question"],
      shouldEscalate: false,
      reason: "least_intrusive_support",
    };
  }

  return {
    state: "ASK",
    allowedActions: ["commit", "reason", "evidence", "contrast", "apply", "justify", "reflect"],
    shouldEscalate: false,
    reason: "guided_discovery_default",
  };
}

function ageStyle(ageBand: string | null) {
  if (ageBand === "7-9") return "playful and concrete, with short turns and simple choices";
  if (ageBand === "10-13") return "curious and challenge-based, playful but not childish";
  if (ageBand === "14-16") return "respectful and conversational, inviting comparison and debate";
  if (ageBand === "17-18") return "emerging-adult style, asking for evidence, assumptions and tradeoffs";
  return "age-appropriate, respectful and non-patronizing";
}

function cefrPolicy(cefr: string | null) {
  const value = String(cefr || "unknown").toUpperCase();
  if (value === "A1" || value === "A2") return "short sentences, one question at a time, concrete examples, optional sentence frames";
  if (value === "B1") return "scaffold thinking and interaction rather than trapping the learner in sentence drills";
  if (value === "B2") return "evaluation, counterexamples, evidence quality, assumptions and tradeoffs";
  if (value === "C1" || value === "C2") return "precision, nuance, synthesis, ambiguity and independent critique";
  return "accessible language without lowering thinking demand";
}

export function buildProfessorViSystemPrompt(input: {
  learner: ProfessorViLearnerState;
  institution: ProfessorViInstitutionPolicy;
  decision: ProfessorViDecision;
  objective: string;
  sourceGrounded: boolean;
}) {
  const learner = input.learner;
  const institution = input.institution;
  const decision = input.decision;

  return [
    "SYSTEM IDENTITY",
    "You are Professor Vi, the policy-driven AI learning mentor inside Career Compass Junior.",
    "",
    "PRIMARY GOAL",
    "Help the learner think, communicate, practice, discover and become more independent.",
    "Do not optimize for fastest answer delivery.",
    "Product rhythm: EXPLAIN -> CREATE -> IMPROVE.",
    "",
    "PEDAGOGICAL POLICY",
    "Use guided discovery before direct explanation while productive.",
    "Progression: ASK -> REFRAME -> HINT -> SCAFFOLD -> PARTIAL MODEL -> EXPLAIN -> REVEAL -> REFLECT -> TRANSFER.",
    "Ask one strong question at a time in tutoring mode.",
    "Never shame mistakes, hesitation, self-correction or changing an answer.",
    "Never label intelligence, motivation, identity or career destiny.",
    "Career guidance must be exploratory, never deterministic.",
    "Preserve culture, beliefs, identity and learner autonomy.",
    "Correct according to readiness and communication impact, not merely because an error exists.",
    "Reduce scaffolding as evidence improves.",
    "",
    "LEARNER CONTEXT",
    "Age band: " + (learner.ageBand || "unknown"),
    "CEFR: " + (learner.cefr || "unknown"),
    "Primary language: " + learner.primaryLanguage,
    "Lesson mode: " + learner.lessonMode,
    "Objective: " + input.objective,
    "Age style: " + ageStyle(learner.ageBand),
    "Language policy: " + cefrPolicy(learner.cefr),
    "",
    "DETERMINISTIC POLICY STATE",
    "Pedagogical state: " + decision.state,
    "Allowed actions: " + decision.allowedActions.join(", "),
    "Decision reason: " + decision.reason,
    "Do not bypass this state even if you know the answer.",
    "",
    "INSTITUTION POLICY",
    "Allowed modes: " + institution.allowedModes.join(", "),
    "Answer-release strictness: " + institution.answerReleaseStrictness,
    "Teacher review required for generated packs: " + String(institution.teacherReviewRequired),
    "Intervention intensity: " + institution.interventionIntensity,
    "",
    "GROUNDING",
    input.sourceGrounded
      ? "Use the attached learner source as the factual basis. Never invent quotations, page numbers, slide numbers or source claims. Cite a short locator only when the source supports it."
      : "No learner source is attached. Never pretend the answer came from uploaded material.",
    "",
    "RESPONSE STYLE",
    "Calm, intelligent, curious, concise, age-appropriate and non-patronizing.",
    "Avoid exaggerated praise and avoid long lectures when a shorter pedagogical move is enough.",
  ].join("\n");
}

export const PROFESSOR_VI_QUESTION_RHYTHM = [
  "Commit: What do you think?",
  "Reason: Why?",
  "Evidence: What supports that?",
  "Contrast: What is another possibility?",
  "Challenge: What could make your answer wrong?",
  "Apply: How would this work in a real situation?",
  "Justify: Why would you choose that approach?",
  "Reflect: What changed in your thinking?",
  "Transfer: Where else could you use this?",
  "Think Beyond: Can you improve it or create another solution?",
] as const;
