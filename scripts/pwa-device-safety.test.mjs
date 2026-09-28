import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

test("service worker never caches private learning surfaces", async () => {
  const sw=await readFile("public/sw.js","utf8");
  for(const prefix of ["/api/","/auth/","/workspace/","/learn/"]){
    assert.ok(sw.includes(`url.pathname.startsWith("${prefix}")`), `missing private cache exclusion: ${prefix}`);
  }
  assert.match(sw,/request\.mode === "navigate"/);
  assert.match(sw,/caches\.match\("\/offline"\)/);
});

test("interactive book route retains mobile recorder compatibility and self-only microphone policy", async () => {
  const route=await readFile("app/interactive-books/[slug]/route.ts","utf8");
  assert.ok(route.includes("SafeMediaRecorder"));
  assert.ok(route.includes('"Permissions-Policy": "microphone=(self)"'));
});
