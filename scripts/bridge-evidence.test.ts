import assert from "node:assert/strict";
import { test } from "node:test";
import { testBridge, validateBridgeDesign, type BridgeDesign } from "../lib/steam/bridge-engine";

const limits = [
  { key: "span", min: 4, max: 8 },
  { key: "supports", min: 1, max: 3 },
  { key: "material", options: ["wood", "steel", "recycled"] },
];
const design: BridgeDesign = { span: 6, supports: 2, deckWidth: 2, material: "wood", accessibility: 1, sustainability: 3, visualStyle: "community-art" };

test("server bridge simulation is reproducible for the published age level", () => {
  assert.equal(validateBridgeDesign("7-9", design, limits), true);
  const first = testBridge("7-9", design);
  assert.deepEqual(testBridge("7-9", { ...design }), first);
  assert.ok(first.stability >= 0 && first.stability <= 100);
});

test("malformed, nonfinite and out-of-level design states cannot be accepted", () => {
  for (const invalid of [null, [], {}, { ...design, material: "__proto__" },
    { ...design, span: 999 }, { ...design, supports: -1 }, { ...design, supports: 2.5 },
    { ...design, deckWidth: 14 }, { ...design, span: Infinity }, { ...design, visualStyle: "invalid" }]) {
    assert.equal(validateBridgeDesign("7-9", invalid, limits), false);
  }
});
