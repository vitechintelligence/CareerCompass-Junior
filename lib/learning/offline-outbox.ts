export type LearningOutboxItem = {
  id: string;
  scope: string;
  url: "/api/learning/attempt";
  body: Record<string, unknown>;
  createdAt: string;
};

const PREFIX = "ccj-learning-outbox:v1:";
const MAX_ITEMS = 50;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function validScope(scope: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(scope);
}

function storageKey(scope: string) {
  return `${PREFIX}${scope}`;
}

export function responseIsSafeForOfflineQueue(response: Record<string, unknown>) {
  // Do not persist free writing/speaking text on a shared device.
  return typeof response.text !== "string";
}

export function readLearningOutbox(scope: string): LearningOutboxItem[] {
  if (typeof window === "undefined" || !validScope(scope)) return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(storageKey(scope)) || "[]");
    if (!Array.isArray(raw)) return [];
    const now = Date.now();
    const items = raw.filter((item): item is LearningOutboxItem => {
      if (!item || typeof item !== "object") return false;
      const value = item as Record<string, unknown>;
      const created = typeof value.createdAt === "string" ? Date.parse(value.createdAt) : NaN;
      return (
        typeof value.id === "string" &&
        value.scope === scope &&
        value.url === "/api/learning/attempt" &&
        value.body != null &&
        typeof value.body === "object" &&
        !Array.isArray(value.body) &&
        Number.isFinite(created) &&
        now - created <= MAX_AGE_MS
      );
    }).slice(-MAX_ITEMS);
    if (items.length !== raw.length) {
      window.localStorage.setItem(storageKey(scope), JSON.stringify(items));
    }
    return items;
  } catch {
    return [];
  }
}

export function enqueueLearningWrite(scope: string, item: Omit<LearningOutboxItem, "scope" | "createdAt">) {
  if (typeof window === "undefined" || !validScope(scope)) return false;
  try {
    const bodyText = JSON.stringify(item.body);
    if (bodyText.length > 24 * 1024) return false;
    const items = readLearningOutbox(scope).filter((existing) => existing.id !== item.id);
    items.push({ ...item, scope, createdAt: new Date().toISOString() });
    window.localStorage.setItem(storageKey(scope), JSON.stringify(items.slice(-MAX_ITEMS)));
    return true;
  } catch {
    return false;
  }
}

export function removeLearningWrite(scope: string, id: string) {
  if (typeof window === "undefined" || !validScope(scope)) return;
  try {
    const items = readLearningOutbox(scope).filter((item) => item.id !== id);
    if (items.length === 0) window.localStorage.removeItem(storageKey(scope));
    else window.localStorage.setItem(storageKey(scope), JSON.stringify(items));
  } catch {
    // Best-effort browser queue cleanup.
  }
}
