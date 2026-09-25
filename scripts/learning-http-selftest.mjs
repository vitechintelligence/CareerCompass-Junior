import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

// Real production server; no database/auth test doubles or production learner writes.
const port = 3217;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, DATABASE_URL: "", NEON_AUTH_BASE_URL: "", NEON_AUTH_COOKIE_SECRET: "" },
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk; });
server.stderr.on("data", (chunk) => { serverLog += chunk; });
let requests = 0;
async function post(body, expectedStatus = 200) {
  const response = await fetch(`${origin}/api/learning/evaluate`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  requests += 1;
  const data = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(data));
  assert.equal(response.headers.get("cache-control"), "no-store");
  if (expectedStatus !== 200) assert.equal(data.evaluation, undefined);
  else { assert.equal(data.evidenceSaved, false); assert.equal(data.persistence, "not_saved"); }
  return data;
}
try {
  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${serverLog}`);
    try { ready = (await fetch(`${origin}/robots.txt`)).ok; } catch { /* starting */ }
    if (ready) break;
    await delay(250);
  }
  assert.ok(ready, "Production server must start");
  const definitions = JSON.parse(await readFile("content/activities/beginner-objective.v1.json", "utf8"));
  for (const activity of definitions) {
    const base = { activityId: activity.activityId, activityVersion: activity.activityVersion, submissionId: randomUUID() };
    const wrong = { ...base, selectedAnswerId: activity.correctAnswerId === "A" ? "B" : "A" };
    const bad = await post(wrong);
    assert.equal(bad.evaluation.outcome, "incorrect");
    assert.equal(bad.evaluation.score, 0);
    assert.equal(bad.evaluation.criterionMet, false);
    assert.deepEqual(await post(wrong), bad, "Duplicate wrong submission cannot become correct");
    assert.equal((await post({ ...wrong, submissionId: randomUUID() })).evaluation.outcome, "incorrect");
    const retry = { ...base, submissionId: randomUUID(), selectedAnswerId: activity.correctAnswerId };
    const good = await post(retry);
    assert.equal(good.evaluation.outcome, "correct");
    assert.deepEqual(await post(retry), good, "Read-only evaluation is retry safe");
    await post({ ...wrong, selectedAnswerId: null }, 400);
    await post({ ...retry, activityVersion: 999 }, 409);
  }
  for (const invalid of [null, [], {}, "{", true]) await post(invalid, 400);
  await post({ padding: "x".repeat(9000) }, 413);
  const html = await (await fetch(`${origin}/interactive-books/career-compass-junior`)).text();
  const publicActivities = JSON.parse(html.match(/<script id="objective-activities" type="application\/json">(.*?)<\/script>/s)[1]);
  assert.equal(publicActivities.length, 31);
  assert.ok(publicActivities.every((activity) => !("correctAnswerId" in activity)));
  assert.ok(html.includes("wireObjectiveChoices(c, l)"));
  assert.ok(!html.includes("b.classList.add('ok'); playDing(); showToast('Tốt lắm! 🎉')"));
  assert.ok(html.includes("SafeMediaRecorder"), "Existing recorder compatibility must remain");
  const afterReload = await (await fetch(`${origin}/interactive-books/career-compass-junior`)).text();
  assert.equal(afterReload, html, "Reload cannot inject a stale successful choice");
  const teen = await fetch(`${origin}/interactive-books/my-compass`);
  assert.equal(teen.status, 200, "Existing teen book route must remain available");
  console.log(JSON.stringify({ status: "passed", objectiveActivities: definitions.length, evaluationRequests: requests, servedBookAndReload: "passed", preservedTeenRoute: "passed", learnerDatabaseWrites: 0, browserJourney: "separate verification required" }));
} finally {
  server.kill("SIGTERM");
}
