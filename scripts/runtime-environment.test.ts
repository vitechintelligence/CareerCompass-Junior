import assert from "node:assert/strict";
import { test } from "node:test";
import {
  productionIdentityMustMatch,
  resolveDeploymentEnvironment,
} from "../lib/runtime-environment";

test("Vercel preview is not treated as production even though Next builds with NODE_ENV=production", () => {
  assert.equal(resolveDeploymentEnvironment({ vercelEnv: "preview", nodeEnv: "production" }), "preview");
  assert.equal(productionIdentityMustMatch("preview"), false);
});

test("Vercel production is strict production", () => {
  assert.equal(resolveDeploymentEnvironment({ vercelEnv: "production", nodeEnv: "production" }), "production");
  assert.equal(productionIdentityMustMatch("production"), true);
});

test("non-Vercel production still fails closed as production", () => {
  assert.equal(resolveDeploymentEnvironment({ nodeEnv: "production" }), "production");
});
