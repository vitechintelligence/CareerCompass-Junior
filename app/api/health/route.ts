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
    environment: runtime.environment,
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

    const [timeRows, schemaRows, remediationRows] = await Promise.all([
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
      sql`
        select
          exists (
            select 1 from information_schema.columns
            where table_schema='public' and table_name='activities' and column_name='content_version'
          ) as activity_contract_v1,
          exists (
            select 1 from information_schema.columns
            where table_schema='public' and table_name='activity_attempts' and column_name='submission_id'
          ) as idempotent_attempts,
          exists (
            select 1 from information_schema.columns
            where table_schema='public' and table_name='submissions' and column_name='current_revision'
          ) as revision_workflow,
          exists (
            select 1 from information_schema.columns
            where table_schema='public' and table_name='assessment_attempts' and column_name='evidence_level'
          ) as evidence_rubrics,
          exists (
            select 1 from information_schema.columns
            where table_schema='public' and table_name='activities' and column_name='qa_status'
          ) as curriculum_qa,
          to_regclass('public.assessment_sessions') is not null as timed_assessment_sessions,
          to_regclass('public.learning_write_quota_windows') is not null as learning_write_quotas,
          exists (
            select 1 from information_schema.columns
            where table_schema='public' and table_name='integration_sync_jobs' and column_name='attempt_count'
          ) as integration_job_runtime,
          to_regclass('public.integration_reconciliation_items') is not null as integration_reconciliation,
          to_regclass('public.data_lifecycle_requests') is not null as data_lifecycle
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
    const remediation = remediationRows[0] || {};
    const remediationChecks = {
      activityContract: remediation.activity_contract_v1 === true,
      idempotentAttempts: remediation.idempotent_attempts === true,
      revisionWorkflow: remediation.revision_workflow === true,
      evidenceRubrics: remediation.evidence_rubrics === true,
      curriculumQa: remediation.curriculum_qa === true,
      timedAssessmentSessions: remediation.timed_assessment_sessions === true,
      learningWriteQuotas: remediation.learning_write_quotas === true,
      integrationJobRuntime: remediation.integration_job_runtime === true,
      integrationReconciliation: remediation.integration_reconciliation === true,
      dataLifecycle: remediation.data_lifecycle === true,
    };
    const remediationSchemaReady = Object.values(remediationChecks).every(Boolean);
    const ok =
      auth.configured &&
      coreSchemaReady &&
      remediationSchemaReady &&
      !runtime.blockingProjectMismatch &&
      !runtime.blockingBranchMismatch &&
      !runtime.blockingEndpointMismatch;

    return NextResponse.json(
      {
        ok,
        app: "career-compass-junior-mastery",
        database: "connected",
        serverTime: timeRows[0]?.server_time ?? null,
        build: {
          commitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
          vercelEnvironment: process.env.VERCEL_ENV || null,
        },
        schema: {
          core: coreSchemaReady ? "ready" : "partial",
          extended: extendedSchemaReady ? "ready" : "partial",
          missingCore,
          missingExtended,
          remediation: remediationSchemaReady ? "ready" : "partial",
          remediationChecks,
          latestExpectedMigration: "014_operational_closeout.sql",
        },
        operationalAcceptance: {
          syntheticAuthenticatedJourney: process.env.CCJ_SYNTHETIC_JOURNEY_VERIFIED === "true" ? "verified" : "not-verified",
          restoreRehearsal: process.env.CCJ_RESTORE_REHEARSAL_VERIFIED === "true" ? "verified" : "not-verified",
          physicalDeviceMatrix: process.env.CCJ_DEVICE_MATRIX_VERIFIED === "true" ? "verified" : "not-verified",
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
