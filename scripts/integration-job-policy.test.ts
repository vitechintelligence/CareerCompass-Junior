import assert from "node:assert/strict";
import { test } from "node:test";
import {
  integrationFailureState,
  integrationJobRunnable,
  integrationRetryDelaySeconds,
} from "../lib/integration-job-policy";

test("integration retry backoff is bounded", () => {
  assert.equal(integrationRetryDelaySeconds(1), 30);
  assert.equal(integrationRetryDelaySeconds(2), 60);
  assert.equal(integrationRetryDelaySeconds(10), 900);
});

test("failed jobs retry until max attempts then dead-letter", () => {
  assert.deepEqual(integrationFailureState(1, 3), { status: "retry", retryAfterSeconds: 30 });
  assert.deepEqual(integrationFailureState(3, 3), { status: "dead_letter", retryAfterSeconds: null });
});

test("only queued/retry due jobs are runnable", () => {
  const now=new Date("2026-09-29T00:00:00Z");
  assert.equal(integrationJobRunnable("queued",null,now),true);
  assert.equal(integrationJobRunnable("retry",new Date("2026-09-28T23:00:00Z"),now),true);
  assert.equal(integrationJobRunnable("retry",new Date("2026-09-29T01:00:00Z"),now),false);
  assert.equal(integrationJobRunnable("completed",null,now),false);
});
