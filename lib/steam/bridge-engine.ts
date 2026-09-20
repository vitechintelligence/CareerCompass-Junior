import type { LearnerAgeBand } from "@/lib/learner-age-bands";

export type BridgeMaterial = "wood" | "recycled" | "steel" | "composite" | "reinforced-concrete" | "timber-hybrid" | "steel-truss" | "cable-supported" | "hybrid-composite";

export type BridgeDesign = {
  span: number;
  supports: number;
  deckWidth: number;
  material: BridgeMaterial;
  accessibility: number;
  sustainability: number;
  visualStyle: "simple" | "nature" | "modern" | "community-art";
};

export type BridgeOutcome = {
  resultState: "stable" | "needs_improvement";
  stability: number;
  capacity: number;
  cost: number;
  communityUse: number;
  sustainability: number;
  observations: string[];
  skills: string[];
};

const MATERIAL: Record<BridgeMaterial, { strength: number; cost: number; eco: number; design: number }> = {
  wood: { strength: 44, cost: 22, eco: 78, design: 72 },
  recycled: { strength: 38, cost: 18, eco: 92, design: 68 },
  steel: { strength: 82, cost: 58, eco: 42, design: 62 },
  composite: { strength: 70, cost: 52, eco: 56, design: 78 },
  "reinforced-concrete": { strength: 88, cost: 62, eco: 35, design: 58 },
  "timber-hybrid": { strength: 72, cost: 48, eco: 76, design: 82 },
  "steel-truss": { strength: 92, cost: 72, eco: 38, design: 70 },
  "cable-supported": { strength: 96, cost: 86, eco: 44, design: 94 },
  "hybrid-composite": { strength: 90, cost: 80, eco: 66, design: 88 },
};

const TARGET: Record<LearnerAgeBand, { stability: number; budget: number; maxSpan: number }> = {
  "7-9": { stability: 42, budget: 85, maxSpan: 8 },
  "10-13": { stability: 52, budget: 140, maxSpan: 20 },
  "14-16": { stability: 62, budget: 320, maxSpan: 45 },
  "17-18": { stability: 70, budget: 600, maxSpan: 80 },
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function testBridge(ageBand: LearnerAgeBand, design: BridgeDesign): BridgeOutcome {
  const material = MATERIAL[design.material] ?? MATERIAL.wood;
  const target = TARGET[ageBand];
  const supportEffect = design.supports * (ageBand === "7-9" ? 15 : 10);
  const spanPenalty = Math.max(0, (design.span / target.maxSpan) * 44);
  const widthPenalty = Math.max(0, design.deckWidth - 3) * 2.5;
  const stability = clamp(material.strength * 0.58 + supportEffect - spanPenalty - widthPenalty + design.accessibility * 1.5);
  const capacity = clamp(stability * 0.82 + material.strength * 0.28 - design.span * 0.35);
  const cost = Math.round(material.cost + design.supports * 9 + design.deckWidth * 5 + design.accessibility * 4 + design.sustainability * 3);
  const communityUse = clamp(48 + design.accessibility * 9 + material.design * 0.18 + (design.visualStyle === "community-art" ? 12 : design.visualStyle === "nature" ? 8 : 4));
  const sustainability = clamp(material.eco * 0.72 + design.sustainability * 7 - design.supports * 1.5);

  const observations: string[] = [];
  if (stability < target.stability) observations.push("The bridge flexed under the test load. More support, a different structure or a stronger material may help.");
  else observations.push("The bridge stayed stable during this test scenario.");

  if (cost > target.budget) observations.push("The design exceeded the mission resource limit. Try changing materials, width or the number of supports.");
  else observations.push("The design stayed within the mission resource limit.");

  if (communityUse >= 72) observations.push("The design considered how people experience and use the bridge.");
  else observations.push("The bridge works as a structure, but the community experience or accessibility could be improved.");

  if (sustainability >= 68) observations.push("The material and design choices produced a relatively strong sustainability result.");
  else observations.push("There is room to reduce environmental impact while protecting safety and usefulness.");

  const resultState = stability >= target.stability && cost <= target.budget ? "stable" : "needs_improvement";
  const skills = ["planning","measurement","problem-solving","design-thinking","communication"];
  if (resultState === "needs_improvement") skills.push("persistence");
  if (design.sustainability >= 3) skills.push("systems-thinking");
  if (design.visualStyle === "community-art" || design.visualStyle === "nature") skills.push("creativity");

  return { resultState, stability, capacity, cost, communityUse, sustainability, observations, skills: Array.from(new Set(skills)) };
}

export function bridgeTargetForAge(ageBand: LearnerAgeBand) {
  return TARGET[ageBand];
}
