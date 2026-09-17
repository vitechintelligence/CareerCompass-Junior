const fallbackSiteUrl = "https://career-compass-junior-lake.vercel.app";

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || fallbackSiteUrl).replace(/\/$/, "");

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, `${SITE_URL}/`).toString();
}
