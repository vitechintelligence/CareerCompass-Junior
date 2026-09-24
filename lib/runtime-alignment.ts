import { CANONICAL_PRODUCTION_ORIGIN } from "@/lib/site";

export const EXPECTED_NEON_PROJECT = {
  name: "Career Compass LMS",
  id: "royal-queen-79814128",
} as const;

function configured(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function normalizeOrigin(value: string | null) {
  if (!value) return null;
  const candidate = value.includes("://") ? value : `https://${value}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

export type RuntimeAlignmentStatus = {
  production: boolean;
  canonicalOrigin: string;
  databaseConfigured: boolean;
  authConfigured: boolean;
  cookieSecretConfigured: boolean;
  projectIdentityDeclared: boolean;
  projectIdentityMatches: boolean | null;
  branchIdentityDeclared: boolean;
  appOriginMatches: boolean | null;
  blockingProjectMismatch: boolean;
  identityVerified: boolean;
  issues: string[];
  warnings: string[];
};

export function getRuntimeAlignmentStatus(): RuntimeAlignmentStatus {
  const production = process.env.NODE_ENV === "production";
  const databaseUrl = configured("DATABASE_URL");
  const authBaseUrl = configured("NEON_AUTH_BASE_URL") || configured("NEON_AUTH_URL");
  const cookieSecret =
    configured("NEON_AUTH_COOKIE_SECRET") || configured("BETTER_AUTH_SECRET");
  const projectId = configured("NEON_PROJECT_ID");
  const branchId = configured("NEON_BRANCH_ID");
  const configuredAppOrigin = normalizeOrigin(configured("NEXT_PUBLIC_APP_URL"));

  const issues: string[] = [];
  const warnings: string[] = [];

  if (!databaseUrl) issues.push("DATABASE_URL is missing.");
  if (!authBaseUrl) issues.push("NEON_AUTH_BASE_URL is missing.");
  if (!cookieSecret) issues.push("NEON_AUTH_COOKIE_SECRET is missing.");

  const projectIdentityMatches = projectId
    ? projectId === EXPECTED_NEON_PROJECT.id
    : null;

  const blockingProjectMismatch =
    production && Boolean(projectId) && projectIdentityMatches === false;

  if (blockingProjectMismatch) {
    issues.push(
      "NEON_PROJECT_ID does not match the authoritative Career Compass LMS project.",
    );
  }

  if (production && !projectId) {
    warnings.push(
      "NEON_PROJECT_ID is not declared, so production project identity cannot be verified.",
    );
  }

  if (production && !branchId) {
    warnings.push(
      "NEON_BRANCH_ID is not declared, so production branch identity cannot be verified.",
    );
  }

  const appOriginMatches = configuredAppOrigin
    ? configuredAppOrigin === CANONICAL_PRODUCTION_ORIGIN
    : null;

  if (production && appOriginMatches === false) {
    warnings.push(
      "NEXT_PUBLIC_APP_URL differs from the canonical Career Compass production origin. Runtime links are pinned in code, but Vercel should be corrected.",
    );
  }

  const identityVerified =
    !production ||
    (projectIdentityMatches === true &&
      Boolean(branchId) &&
      (appOriginMatches === true || appOriginMatches === null));

  return {
    production,
    canonicalOrigin: CANONICAL_PRODUCTION_ORIGIN,
    databaseConfigured: Boolean(databaseUrl),
    authConfigured: Boolean(authBaseUrl),
    cookieSecretConfigured: Boolean(cookieSecret),
    projectIdentityDeclared: Boolean(projectId),
    projectIdentityMatches,
    branchIdentityDeclared: Boolean(branchId),
    appOriginMatches,
    blockingProjectMismatch,
    identityVerified,
    issues,
    warnings,
  };
}

export function assertNoKnownProductionProjectMismatch() {
  const status = getRuntimeAlignmentStatus();

  if (status.blockingProjectMismatch) {
    throw new Error(
      "Production Neon project mismatch. Expected Career Compass LMS (royal-queen-79814128).",
    );
  }
}
