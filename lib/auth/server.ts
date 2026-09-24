import { createNeonAuth } from "@neondatabase/auth/next/server";
import { getRuntimeAlignmentStatus } from "@/lib/runtime-alignment";

let cachedAuth: ReturnType<typeof createNeonAuth> | null = null;

const MIN_COOKIE_SECRET_LENGTH = 32;

function firstConfigured(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

function isValidAuthBaseUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    const localDevelopment = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const protocolAllowed = url.protocol === "https:" || (localDevelopment && url.protocol === "http:");

    return protocolAllowed && Boolean(url.hostname);
  } catch {
    return false;
  }
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
  const invalid: string[] = [];

  if (!baseUrl) {
    missing.push("NEON_AUTH_BASE_URL");
  } else if (!isValidAuthBaseUrl(baseUrl)) {
    invalid.push("NEON_AUTH_BASE_URL");
  }

  if (!secret) {
    missing.push("NEON_AUTH_COOKIE_SECRET");
  } else if (secret.length < MIN_COOKIE_SECRET_LENGTH) {
    invalid.push("NEON_AUTH_COOKIE_SECRET");
  }

  const runtime = getRuntimeAlignmentStatus();

  if (runtime.blockingProjectMismatch) {
    invalid.push("NEON_PROJECT_ID");
  }

  if (runtime.blockingBranchMismatch) {
    invalid.push("NEON_BRANCH_ID");
  }

  if (runtime.blockingEndpointMismatch) {
    invalid.push("NEON_BACKEND_ALIGNMENT");
  }

  const configured = missing.length === 0 && invalid.length === 0;
  const baseUrlValid = isValidAuthBaseUrl(baseUrl);
  const cookieSecretValid = typeof secret === "string" && secret.length >= MIN_COOKIE_SECRET_LENGTH;

  return {
    configured,
    baseUrlConfigured: Boolean(baseUrl),
    baseUrlValid,
    cookieSecretConfigured: Boolean(secret),
    cookieSecretValid,
    missing,
    invalid,
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
