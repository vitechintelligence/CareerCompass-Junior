export function aggregateUnitProgress(totalPublishedUnits: number, recordedPercents: number[]) {
  if (!Number.isInteger(totalPublishedUnits) || totalPublishedUnits <= 0) return 0;
  const bounded = recordedPercents
    .slice(0, totalPublishedUnits)
    .map((value) => Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);
  const total = bounded.reduce((sum, value) => sum + value, 0);
  return Math.round(total / totalPublishedUnits);
}

export function practiceStorageKey(namespace: string, kind: "completed" | "reflection", lessonId?: number) {
  const safeNamespace = namespace.trim().replace(/[^A-Za-z0-9:_-]/g, "_").slice(0, 160);
  if (!safeNamespace) throw new Error("practice_storage_namespace_required");
  if (kind === "reflection") {
    if (!Number.isInteger(lessonId) || Number(lessonId) < 1 || Number(lessonId) > 1000) {
      throw new Error("practice_storage_lesson_invalid");
    }
    return `ccj-unit1:${safeNamespace}:reflection:${lessonId}`;
  }
  return `ccj-unit1:${safeNamespace}:completed`;
}
