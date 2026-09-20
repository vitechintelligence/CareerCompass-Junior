import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { LEARNER_AGE_BANDS, LEARNER_AGE_PROFILES, isLearnerAgeBand, type LearnerAgeBand } from "@/lib/learner-age-bands";
import { bridgeMissionForAge } from "@/lib/steam-missions";
import CommunityBridgeExperience from "./CommunityBridgeExperience";

export default async function CommunityBridgePage({
  searchParams,
}: {
  searchParams: Promise<{ age?: string }>;
}) {
  const params = await searchParams;
  const ageBand: LearnerAgeBand = params.age && isLearnerAgeBand(params.age) ? params.age : "10-13";
  const mission = bridgeMissionForAge(ageBand);

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/steam-lab"><VitechMark /><span>STEAM LAB</span></Link>
        <div><strong>Community Bridge Designer</strong><div className="muted" style={{ fontSize: 12 }}>Discover → design → test → improve</div></div>
        <Link className="pill" href="/steam-lab">All studios</Link>
      </header>
      <div className="workspaceContent">
        <section className="panel">
          <div className="eyebrow">Choose the correct learner level</div>
          <div className="actions">{LEARNER_AGE_BANDS.map((key) => <Link className={`button ${key === ageBand ? "primary" : ""}`} href={`/steam-lab/community-bridge?age=${key}`} key={key}>{LEARNER_AGE_PROFILES[key].ageLabelEn} · {LEARNER_AGE_PROFILES[key].gradeLabelEn}</Link>)}</div>
        </section>
        <CommunityBridgeExperience ageBand={ageBand} mission={mission} />
      </div>
    </main>
  );
}
