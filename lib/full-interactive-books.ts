export type FullInteractiveBookConfig = {
  slug: "my-compass" | "career-compass-junior";
  lessonSummary: string;
};

const fullInteractiveBooks: Record<string, FullInteractiveBookConfig> = {
  "MY-COMPASS": {
    slug: "my-compass",
    lessonSummary: "12 units · 24 lessons · capstone",
  },
  "CCJ-MASTERY-BEGINNER": {
    slug: "career-compass-junior",
    lessonSummary: "12 units · 96 lessons",
  },
};

export function getFullInteractiveBook(bookCode: string) {
  return fullInteractiveBooks[bookCode] ?? null;
}

export function fullInteractiveStartHash(bookCode: string, unitCode?: string | null) {
  const unitNumber = Number((unitCode ?? "").replace(/^U/i, ""));
  if (!Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 12) return "";

  if (bookCode === "MY-COMPASS") return `#u${unitNumber}l0`;
  if (bookCode === "CCJ-MASTERY-BEGINNER") return `#u${unitNumber}`;
  return "";
}
