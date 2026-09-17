import { createNeonAuth } from "@neondatabase/auth/next/server";

let cachedAuth: ReturnType<typeof createNeonAuth> | null = null;

function firstConfigured(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function getAuthConfigurationStatus() {
  const baseUrl = firstConfigured(
    process.env.NEON_AUTH_BASE_URL,
    process.env.NEON_AUTH_URL,
  );
  const secret = firstConfigured(
    process.env.NEON_AUTH_COOKIE_SECRET,
    process.env.BETTER_AUTH_SECRET,
  );

  const missing: string[] = [];
  if (!baseUrl) missing.push("NEON_AUTH_BASE_URL");
  if (!secret) missing.push("NEON_AUTH_COOKIE_SECRET");

  return {
    configured: missing.length === 0,
    baseUrlConfigured: Boolean(baseUrl),
    cookieSecretConfigured: Boolean(secret),
    missing,
    baseUrl,
    secret,
  };
}

export function getAuth() {
  if (cachedAuth) return cachedAuth;

  const configuration = getAuthConfigurationStatus();
  if (!configuration.configured || !configuration.baseUrl || !configuration.secret) {
    return null;
  }

  cachedAuth = createNeonAuth({
    baseUrl: configuration.baseUrl,
    cookies: { secret: configuration.secret },
  });

  return cachedAuth;
}
