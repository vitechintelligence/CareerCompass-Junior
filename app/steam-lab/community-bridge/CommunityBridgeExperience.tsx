"use client";

import { useMemo, useState } from "react";
import type { LearnerAgeBand } from "@/lib/learner-age-bands";
import type { SteamMissionDefinition } from "@/lib/steam-missions";
import { bridgeTargetForAge, testBridge, type BridgeDesign, type BridgeOutcome } from "@/lib/steam/bridge-engine";

type Attempt = {
  number: number;
  design: BridgeDesign;
  outcome: BridgeOutcome;
};

function defaults(ageBand: LearnerAgeBand): BridgeDesign {
  if (ageBand === "7-9") return { span: 6, supports: 2, deckWidth: 2, material: "wood", accessibility: 1, sustainability: 3, visualStyle: "community-art" };
  if (ageBand === "10-13") return { span: 14, supports: 3, deckWidth: 3, material: "wood", accessibility: 2, sustainability: 3, visualStyle: "nature" };
  if (ageBand === "14-16") return { span: 28, supports: 4, deckWidth: 5, material: "steel", accessibility: 2, sustainability: 3, visualStyle: "modern" };
  return { span: 46, supports: 5, deckWidth: 7, material: "steel-truss", accessibility: 3, sustainability: 3, visualStyle: "modern" };
}

export default function CommunityBridgeExperience({
  ageBand,
  mission,
}: {
  ageBand: LearnerAgeBand;
  mission: SteamMissionDefinition;
}) {
  const [design, setDesign] = useState<BridgeDesign>(() => defaults(ageBand));
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [changeNote, setChangeNote] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "local">("idle");
  const [reflection, setReflection] = useState("");
  const target = bridgeTargetForAge(ageBand);
  const latest = attempts.at(-1);

  const constraints = useMemo(() => new Map(mission.constraints.map((item) => [item.key, item])), [mission.constraints]);
  const materialOptions = constraints.get("material")?.options || ["wood","steel","composite"];

  function numberConstraint(key: string, fallbackMin: number, fallbackMax: number) {
    const item = constraints.get(key);
    return { min: item?.min ?? fallbackMin, max: item?.max ?? fallbackMax };
  }

  async function runTest() {
    const outcome = testBridge(ageBand, design);
    const attempt: Attempt = { number: attempts.length + 1, design: { ...design }, outcome };
    setAttempts((current) => [...current, attempt]);
    setSyncState("saving");

    try {
      const response = await fetch("/api/steam/bridge-attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ageBand,
          design,
          outcome,
          observation: outcome.observations.join(" "),
          changeFromPrevious: changeNote,
          runMode: "individual",
        }),
      });
      const data = await response.json().catch(() => ({}));
      setSyncState(response.ok && data?.synced ? "saved" : "local");
    } catch {
      setSyncState("local");
    }
    setChangeNote("");
  }

  const spanRange = numberConstraint("span", 4, 80);
  const supportRange = numberConstraint("supports", 1, 9);
  const widthRange = numberConstraint("deckWidth", 2, 14);
  const accessibilityRange = numberConstraint("accessibility", 0, 5);
  const sustainabilityRange = numberConstraint("sustainability", 1, 5);

  return (
    <div className="steamMissionShell">
      <section className="steamMissionHero">
        <div>
          <div className="eyebrow">Integrated STEAM mission · {mission.difficultyLabelEn}</div>
          <h1>{mission.titleEn}</h1>
          <p>{mission.missionPromptEn}</p>
          <div className="tagRow">{mission.studios.map((studio) => <span className="tag" key={studio}>{studio.replaceAll("-"," ")}</span>)}</div>
        </div>
        <div className="steamMissionStatus">
          <strong>{attempts.length}</strong>
          <span>test attempt{attempts.length === 1 ? "" : "s"}</span>
          <small>{syncState === "saving" ? "Saving…" : syncState === "saved" ? "Evidence synced" : syncState === "local" ? "Local practice" : "Ready"}</small>
        </div>
      </section>

      <section className="steamProcessStrip">
        {["Discover","Imagine","Design","Build","Test","Observe","Improve","Explain","Reflect"].map((step, index) => <span className={index <= Math.min(8, attempts.length ? 6 : 3) ? "active" : ""} key={step}>{step}</span>)}
      </section>

      <section className="workspaceGrid">
        <article className="panel">
          <div className="eyebrow">Design studio</div>
          <h2 className="workspaceTitle">Build your bridge</h2>

          <div className="bridgePreview" aria-label="Visual bridge preview">
            <div className={`bridgeDeck style-${design.visualStyle}`} style={{ width: `${Math.min(94, 42 + design.span)}%` }}>
              {Array.from({ length: design.supports }).map((_, index) => <span className="bridgeSupport" key={index} />)}
            </div>
            <span className="bridgeBank left">Community A</span><span className="bridgeBank right">Community B</span>
          </div>

          <div className="workspaceForm">
            <Range label={ageBand === "7-9" ? "Bridge length" : "Span"} value={design.span} min={spanRange.min} max={spanRange.max} onChange={(span) => setDesign((current) => ({ ...current, span }))} />
            <Range label="Supports" value={design.supports} min={supportRange.min} max={supportRange.max} onChange={(supports) => setDesign((current) => ({ ...current, supports }))} />
            {ageBand !== "7-9" && <Range label="Deck width" value={design.deckWidth} min={widthRange.min} max={widthRange.max} onChange={(deckWidth) => setDesign((current) => ({ ...current, deckWidth }))} />}

            <label><span>Material</span><select value={design.material} onChange={(event) => setDesign((current) => ({ ...current, material: event.target.value as BridgeDesign["material"] }))}>{materialOptions.map((item) => <option value={item} key={item}>{item.replaceAll("-"," ")}</option>)}</select></label>

            <label><span>Community design</span><select value={design.visualStyle} onChange={(event) => setDesign((current) => ({ ...current, visualStyle: event.target.value as BridgeDesign["visualStyle"] }))}><option value="simple">Simple & clear</option><option value="nature">Nature-inspired</option><option value="modern">Modern</option><option value="community-art">Community art</option></select></label>

            {ageBand !== "7-9" && <Range label="Accessibility" value={design.accessibility} min={accessibilityRange.min} max={accessibilityRange.max} onChange={(accessibility) => setDesign((current) => ({ ...current, accessibility }))} />}
            {(ageBand === "14-16" || ageBand === "17-18") && <Range label="Sustainability target" value={design.sustainability} min={sustainabilityRange.min} max={sustainabilityRange.max} onChange={(sustainability) => setDesign((current) => ({ ...current, sustainability }))} />}

            {attempts.length > 0 && <label><span>What are you changing this time?</span><input value={changeNote} onChange={(event) => setChangeNote(event.target.value)} placeholder="I will move a support / change the material / improve access…" maxLength={1200} /></label>}
            <button className="button primary" type="button" onClick={runTest}>▶ Test bridge</button>
          </div>
        </article>

        <article className="panel">
          <div className="eyebrow">Test & observe</div>
          <h2 className="workspaceTitle">{latest ? (latest.outcome.resultState === "stable" ? "Your bridge handled this test." : "You discovered something!") : "Run your first test."}</h2>

          {!latest ? <div className="emptyState"><span>🏗️</span><p className="muted">There is no single perfect bridge. Make choices, test the consequence and improve your idea.</p></div> : <>
            <OutcomeDisplay ageBand={ageBand} outcome={latest.outcome} budget={target.budget} />
            <div className="workspaceList" style={{ marginTop: 14 }}>{latest.outcome.observations.map((item) => <div className="workspaceRow" key={item}><span>🔎</span><span>{item}</span></div>)}</div>
            <div className="statusBanner"><strong>{latest.outcome.resultState === "stable" ? "What could make it even better?" : "What would you like to change?"}</strong><span>A first attempt is evidence. Improvement is part of the mission, not a penalty.</span></div>
          </>}

          {attempts.length > 1 && <div className="steamAttemptTimeline">
            {attempts.map((attempt) => <div key={attempt.number}><strong>Attempt {attempt.number}</strong><span>Stability {attempt.outcome.stability} · Cost {attempt.outcome.cost} · {attempt.outcome.resultState.replace("_"," ")}</span></div>)}
          </div>}
        </article>
      </section>

      <section className="workspaceGrid">
        <article className="panel">
          <div className="eyebrow">Skills discovery</div>
          <h2 className="workspaceTitle">What you practiced</h2>
          <div className="tagRow">{(latest?.outcome.skills || mission.skillTags.slice(0,5)).map((skill) => <span className="tag" key={skill}>You practiced · {skill.replaceAll("-"," ")}</span>)}</div>
          <p className="muted" style={{ marginTop: 14 }}>These are observations from the activity, not personality labels or fixed career predictions.</p>
        </article>

        <article className="panel">
          <div className="eyebrow">Career connections</div>
          <h2 className="workspaceTitle">Explore where these skills appear.</h2>
          <div className="tagRow">{mission.careerConnections.map((item) => <span className="tag" key={item.labelEn}>{item.labelEn}</span>)}</div>
          <p className="muted" style={{ marginTop: 14 }}>You can explore these fields because the mission uses related skills. The platform does not tell you what career you “should” choose.</p>
        </article>
      </section>

      <section className="panel">
        <div className="eyebrow">Reflect</div>
        <h2 className="workspaceTitle">{mission.reflectionPromptsEn[0]}</h2>
        <div className="choiceGrid">
          {["My structure","My materials","How people use it","My testing idea","My visual design"].map((item) => <button className={`choiceButton ${reflection === item ? "selected" : ""}`} type="button" onClick={() => setReflection(item)} key={item}>{item}</button>)}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>{reflection ? `You selected: ${reflection}. Think about what you would try next.` : "Choose one part that changed your thinking."}</p>
      </section>
    </div>
  );
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label><span>{label} · <strong>{value}</strong></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function OutcomeDisplay({ ageBand, outcome, budget }: { ageBand: LearnerAgeBand; outcome: BridgeOutcome; budget: number }) {
  if (ageBand === "7-9") {
    return <div className="miniGrid"><div className="miniCard light"><strong>{outcome.stability >= 42 ? "Steady 🌟" : "Wobbly 🔁"}</strong><span>How the bridge handled the test</span></div><div className="miniCard light"><strong>{outcome.cost <= budget ? "Resources OK" : "Too many resources"}</strong><span>Try making smart choices</span></div><div className="miniCard light"><strong>{outcome.communityUse >= 72 ? "People-friendly" : "Could help people more"}</strong><span>Arts + empathy</span></div></div>;
  }
  const metrics = ageBand === "10-13"
    ? [["Stability",outcome.stability],["Cost",outcome.cost],["Community use",outcome.communityUse]]
    : [["Stability",outcome.stability],["Capacity",outcome.capacity],["Cost",outcome.cost],["Community use",outcome.communityUse],["Sustainability",outcome.sustainability]];
  return <div className="metricGrid">{metrics.map(([label,value]) => <div className="metric" key={String(label)}><span className="muted">{label}</span><strong>{String(value)}</strong><span className="muted">{label === "Cost" ? `target ≤ ${budget}` : "simulation indicator"}</span></div>)}</div>;
}
