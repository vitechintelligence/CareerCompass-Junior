import { createNeonAuth } from "@neondatabase/auth/next/server";

let cachedAuth: ReturnType<typeof createNeonAuth> | null = null;

export function getAuth() {
  if (cachedAuth) return cachedAuth;

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl || !secret) return null;

  cachedAuth = createNeonAuth({
    baseUrl,
    cookies: { secret },
  });

  return cachedAuth;
}
