export const CANONICAL_PRODUCTION_ORIGIN =
  "https://career-compass-junior-vitech.vercel.app";

const localFallback = "http://localhost:3000";

function normalizeSiteUrl(value: string) {
  return value.replace(/\/$/, "");
}

function resolvedSiteUrl() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  if (process.env.NODE_ENV === "production") return CANONICAL_PRODUCTION_ORIGIN;
  return process.env.NEXT_PUBLIC_APP_URL || localFallback;
}

export const SITE_URL = normalizeSiteUrl(resolvedSiteUrl());

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, `${SITE_URL}/`).toString();
}
