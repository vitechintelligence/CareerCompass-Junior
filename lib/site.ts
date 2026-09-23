export const CANONICAL_PRODUCTION_ORIGIN =
  "https://career-compass-junior-vitech.vercel.app";

const localFallback = "http://localhost:3000";

function normalizeSiteUrl(value: string) {
  return value.replace(/\/$/, "");
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NODE_ENV === "production"
    ? CANONICAL_PRODUCTION_ORIGIN
    : process.env.NEXT_PUBLIC_APP_URL || localFallback,
);

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, `${SITE_URL}/`).toString();
}
