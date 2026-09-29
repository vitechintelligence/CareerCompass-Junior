import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function source(path){ return readFile(path,"utf8"); }

test("runtime guard uses authoritative production branch and separates preview", async () => {
  const runtime=await source("lib/runtime-alignment.ts");
  assert.match(runtime,/br-shiny-meadow-b3ibu54h/);
  assert.match(runtime,/resolveDeploymentEnvironment/);
});

test("assessment publishing is draft-first and timed submissions are server-owned", async () => {
  const teacher=await source("app/workspace/teacher/assessments/actions.ts");
  const student=await source("app/workspace/student/assessment/[assessmentId]/actions.ts");
  assert.match(teacher,/'draft'/);
  assert.match(teacher,/sql\.transaction/);
  assert.match(teacher,/correct answer must match one of its options/i);
  assert.match(student,/assessment_sessions/);
  assert.match(student,/past its due date/i);
  assert.match(student,/expires_at/);
});

test("partner enrollment requires explicit published book selection", async () => {
  const actions=await source("app/workspace/partner/actions.ts");
  assert.match(actions,/formData\.get\("bookCode"\)/);
  assert.match(actions,/where code=\$\{bookCode\}/);
  assert.doesNotMatch(actions,/where code = 'CCJ-MASTERY-BEGINNER'/);
});

test("STEAM writes use idempotency and atomic attempt numbering", async () => {
  const api=await source("app/api/steam/bridge-attempt/route.ts");
  const migrations=(await Promise.all([
    source("db/migrations/011_duplicate_safe_events.sql"),
    source("db/migrations/012_evidence_rubrics_reporting.sql"),
  ])).join("\n");
  assert.match(api,/pg_advisory_xact_lock/);
  assert.match(api,/on conflict \(submission_id\)/);
  assert.match(api,/attempt_count \+ 1/);
  assert.match(migrations,/idx_steam_attempts_submission_id/);
  assert.match(migrations,/idx_steam_runs_active_context/);
});

test("STEAM mission persists and hydrates reflection evidence", async () => {
  const api=await source("app/api/steam/bridge-attempt/route.ts");
  const client=await source("app/steam-lab/community-bridge/CommunityBridgeExperience.tsx");
  assert.match(api,/export async function GET/);
  assert.match(api,/export async function PUT/);
  assert.match(api,/reflection=/);
  assert.match(api,/explanation=/);
  assert.match(client,/Loading saved mission/);
  assert.match(client,/Save explanation & reflection/);
});

test("teacher professional evidence needs reviewer verification", async () => {
  const actions=await source("app/workspace/teacher/upskill/actions.ts");
  const review=await source("app/workspace/admin/teacher-evidence/page.tsx");
  assert.match(actions,/evidence_status='submitted'/);
  assert.match(actions,/requirePlatformAdmin/);
  assert.match(actions,/changes_requested/);
  assert.match(review,/Verify evidence/);
});

test("guardian access is report-only and consent-gated", async () => {
  const partner=await source("app/workspace/partner/actions.ts");
  const report=await source("app/workspace/guardian/report/[learnerId]/page.tsx");
  assert.match(partner,/guardian_reporting/);
  assert.match(partner,/guardian_report_links/);
  assert.match(report,/guardian_reporting/);
  assert.match(report,/guardian_profile_id/);
});

test("health and lifecycle closeout are explicit", async () => {
  const health=await source("app/api/health/route.ts");
  const exportRoute=await source("app/api/account/export/route.ts");
  assert.match(health,/014_operational_closeout\.sql/);
  assert.match(health,/syntheticAuthenticatedJourney/);
  assert.match(health,/restoreRehearsal/);
  assert.match(exportRoute,/Content-Disposition/);
  assert.match(exportRoute,/learningEvidence/);
});

test("catalog does not confuse source interactive book with complete LMS mapping", async () => {
  const books=await source("app/books/page.tsx");
  const catalog=await source("lib/book-catalog.ts");
  assert.match(books,/LMS mapping in progress/);
  assert.match(catalog,/conversionStatus/);
  assert.doesNotMatch(books,/Complete interactive edition/);
});

test("early-years speaking records practice rather than typed mastery", async () => {
  const generic=await source("app/learn/[bookCode]/[unitCode]/GenericActivity.tsx");
  assert.match(generic,/earlyYears/);
  assert.match(generic,/voice_practice/);
  assert.match(generic,/does not prove mastery/);
});
