export type EvidenceLevel = "practiced" | "demonstrated" | "verified";

export function scorePercent(score: number, maxScore: number) {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return 0;
  return Math.max(0, Math.min(100, (score / maxScore) * 100));
}

export function assessmentEvidenceLevel(input: {
  score: number;
  maxScore: number;
  demonstratedThreshold: number;
  teacherVerified?: boolean;
}): EvidenceLevel {
  if (input.teacherVerified) return "verified";
  const threshold = Math.max(0, Math.min(100, Number(input.demonstratedThreshold)));
  return scorePercent(input.score, input.maxScore) >= threshold ? "demonstrated" : "practiced";
}

export function evidenceStatusForLevel(level: EvidenceLevel) {
  return level === "verified" ? "verified" : "draft";
}

export type ParentReportEvidenceRow = {
  titleEn: string;
  titleVi: string;
  level: EvidenceLevel;
  sourceType: string;
  achievedOn?: string | null;
};

export function summarizeEvidenceLevels(rows: ParentReportEvidenceRow[]) {
  return {
    practiced: rows.filter((row) => row.level === "practiced"),
    demonstrated: rows.filter((row) => row.level === "demonstrated"),
    verified: rows.filter((row) => row.level === "verified"),
  };
}
