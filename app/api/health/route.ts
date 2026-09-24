import { NextResponse } from "next/server";
import { getAuthConfigurationStatus } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getRuntimeAlignmentStatus } from "@/lib/runtime-alignment";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

const CORE_TABLES = [
  "profiles",
  "organizations",
  "organization_memberships",
  "classes",
  "books",
  "book_units",
  "activities",
  "student_enrollments",
  "book_progress",
  "activity_attempts",
  "learning_capsules",
] as const;

const EXTENDED_TABLES = [
  "partner_onboarding_requests",
  "organization_features",
  "institution_sites",
  "workflow_runs",
  "integration_provider_requests",
  "industry_connection_requests",
  "school_company_connections",
  "industry_partners",
  "industry_roles",
  "vst_junior_simulations",
] as const;

function authPublicStatus() {
  const auth = getAuthConfigurationStatus();

  return {
    configured: auth.configured,
    baseUrlConfigured: auth.baseUrlConfigured,
    baseUrlValid: auth.baseUrlValid,
    cookieSecretConfigured: auth.cookieSecretConfigured,
    cookieSecretValid: auth.cookieSecretValid,
    missing: auth.missing,
    invalid: auth.invalid,
  };
}

function runtimePublicStatus() {
  const runtime = getRuntimeAlignmentStatus();

  return {
    canonicalOrigin: runtime.canonicalOrigin,
    databaseConfigured: runtime.databaseConfigured,
    authConfigured: runtime.authConfigured,
    cookieSecretConfigured: runtime.cookieSecretConfigured,
    projectIdentityDeclared: runtime.projectIdentityDeclared,
    projectIdentityMatches: runtime.projectIdentityMatches,
    branchIdentityDeclared: runtime.branchIdentityDeclared,
    branchIdentityMatches: runtime.branchIdentityMatches,
    appOriginMatches: runtime.appOriginMatches,
    databaseAuthEndpointMatches: runtime.databaseAuthEndpointMatches,
    identityVerified: runtime.identityVerified,
    blockingProjectMismatch: runtime.blockingProjectMismatch,
    blockingBranchMismatch: runtime.blockingBranchMismatch,
    blockingEndpointMismatch: runtime.blockingEndpointMismatch,
    issues: runtime.issues,
    warnings: runtime.warnings,
  };
}

export async function GET() {
  const auth = authPublicStatus();
  const runtime = runtimePublicStatus();

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        app: "career-compass-junior-mastery",
        database: "not-configured",
        auth,
        runtime,
      },
      { status: 503, headers: noStore },
    );
  }

  try {
    const sql = getDb();

    const [timeRows, schemaRows] = await Promise.all([
      sql`select now() as server_time`,
      sql`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'profiles',
            'organizations',
            'organization_memberships',
            'classes',
            'books',
            'book_units',
            'activities',
            'student_enrollments',
            'book_progress',
            'activity_attempts',
            'learning_capsules',
            'partner_onboarding_requests',
            'organization_features',
            'institution_sites',
            'workflow_runs',
            'integration_provider_requests',
            'industry_connection_requests',
            'school_company_connections',
            'industry_partners',
            'industry_roles',
            'vst_junior_simulations'
          )
      `,
    ]);

    const availableTables = new Set(
      schemaRows.map((row) => String(row.table_name)),
    );
    const missingCore = CORE_TABLES.filter(
      (table) => !availableTables.has(table),
    );
    const missingExtended = EXTENDED_TABLES.filter(
      (table) => !availableTables.has(table),
    );

    const coreSchemaReady = missingCore.length === 0;
    const extendedSchemaReady = missingExtended.length === 0;
    const ok =
      auth.configured &&
      coreSchemaReady &&
      !runtime.blockingProjectMismatch &&
      !runtime.blockingBranchMismatch &&
      !runtime.blockingEndpointMismatch;

    return NextResponse.json(
      {
        ok,
        app: "career-compass-junior-mastery",
        database: "connected",
        serverTime: timeRows[0]?.server_time ?? null,
        schema: {
          core: coreSchemaReady ? "ready" : "partial",
          extended: extendedSchemaReady ? "ready" : "partial",
          missingCore,
          missingExtended,
        },
        auth,
        runtime,
      },
      {
        status: ok ? 200 : 503,
        headers: noStore,
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        app: "career-compass-junior-mastery",
        database: "unreachable",
        auth,
        runtime,
      },
      { status: 503, headers: noStore },
    );
  }
}
