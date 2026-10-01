import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

// Exercise the compiled Next.js boundaries with synthetic configuration only.
// No real credentials, authenticated users, or application database rows are used.
const secret = "synthetic-boundary-secret-at-least-32-characters";
const flags = Object.fromEntries([
  "TIMED_ASSESSMENTS", "LEARNING_WRITE_QUOTAS", "OFFLINE_OUTBOX",
  "INTEGRATION_JOB_EXECUTION", "GUARDIAN_REPORTING", "LEARNER_DATA_EXPORT", "DELETION_REVIEW",
].map(name => [`CCJ_FEATURE_${name}`, "false"]));
let requests = 0;

async function exercise(port, overrides, check) {
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start",
    "--hostname", "127.0.0.1", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...flags, NODE_ENV: "production", VERCEL_ENV: "preview",
      DATABASE_URL: "", NEON_AUTH_BASE_URL: "", NEON_AUTH_COOKIE_SECRET: "",
      NEON_PROJECT_ID: "royal-queen-79814128", NEON_BRANCH_ID: "br-synthetic-preview",
      ...overrides },
  });
  let log = "";
  server.stdout.on("data", chunk => { log += chunk; });
  server.stderr.on("data", chunk => { log += chunk; });
  try {
    let ready = false;
    for (let i = 0; i < 60; i += 1) {
      if (server.exitCode !== null) throw new Error(`Production server exited: ${log}`);
      try { ready = (await fetch(`${origin}/robots.txt`)).ok; } catch { /* server starting */ }
      if (ready) break;
      await delay(250);
    }
    assert.ok(ready, "Production server must start");
    await check(async (path, init) => {
      const response = await fetch(`${origin}${path}`, init);
      requests += 1;
      const text = await response.text();
      assert.ok(!text.includes(secret), "Synthetic secret must not be returned");
      assert.ok(!text.includes("postgresql://"), "Connection strings must not be returned");
      return { response, text };
    });
  } finally {
    if (server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill("SIGTERM");
      await exited;
    }
  }
}

await exercise(3231, {}, async request => {
  const { response, text } = await request("/api/account/export?learnerId=foreign&organizationId=foreign");
  assert.equal(response.status, 401);
  assert.equal(JSON.parse(text).error, "authentication_required");
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("content-disposition"), null);
  const guardian = await request("/workspace/guardian");
  assert.equal(guardian.response.status, 200);
  assert.match(guardian.text, /Guardian reporting is currently disabled/);
});

await exercise(3232, {
  NEON_BRANCH_ID: "br-shiny-meadow-b3ibu54h",
  DATABASE_URL: "postgresql://synthetic:synthetic@ep-damp-bonus-b300sxd5-pooler.neon.tech/neondb",
  NEON_AUTH_BASE_URL: "https://ep-damp-bonus-b300sxd5.neonauth.test/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: secret,
}, async request => {
  for (const [path, init] of [
    ["/api/auth/get-session", undefined],
    ["/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "synthetic@example.invalid", password: "synthetic-only" }) }],
  ]) {
    const { response, text } = await request(path, init);
    assert.equal(response.status, 503);
    assert.ok(JSON.parse(text).invalid.includes("NEON_PRODUCTION_REUSE"));
  }
  const { response, text } = await request("/api/health");
  assert.equal(response.status, 503);
  const health = JSON.parse(text);
  assert.equal(health.auth.configured, false);
  assert.equal(health.runtime.blockingNonProductionProductionReuse, true);
  assert.equal(health.ok, false);
});

console.log(JSON.stringify({ status: "passed", requests, anonymousExport: "denied",
  guardianFlagOff: "denied", previewProductionAuthReuse: "denied",
  previewProductionDatabaseReuse: "denied", applicationDatabaseWrites: 0,
  authenticatedJourney: "not tested" }));
