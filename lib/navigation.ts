export function safeInternalPath(value: string | undefined, fallback: string) {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const parsed = new URL(value, "https://career-compass.invalid");
    if (parsed.origin !== "https://career-compass.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
