export function normalizeGradeLevel(value: unknown) {
  const grade = typeof value === "string" ? value.trim() : "";
  return /^(?:[1-9]|1[0-2])$/.test(grade) ? grade : null;
}

export function normalizeLearnerAgeBand(value: unknown) {
  const raw = typeof value === "string" ? value.trim().replace(/[–—]/g, "-") : "";
  const match = raw.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const low = Number(match[1]);
  const high = Number(match[2]);
  if (low < 3 || high > 21 || low > high) return null;
  return `${low}-${high}`;
}

export function normalizeEnglishLevel(value: unknown) {
  const level = typeof value === "string" ? value.trim().slice(0, 80) : "";
  return level || null;
}

export type ExplicitClassLearningContext = {
  gradeLevel: string | null;
  learnerAgeBand: string | null;
  englishLevel: string | null;
};

export function explicitClassLearningContext(input: {
  gradeLevel?: unknown;
  learnerAgeBand?: unknown;
  englishLevel?: unknown;
}): ExplicitClassLearningContext {
  return {
    gradeLevel: normalizeGradeLevel(input.gradeLevel),
    learnerAgeBand: normalizeLearnerAgeBand(input.learnerAgeBand),
    englishLevel: normalizeEnglishLevel(input.englishLevel),
  };
}
