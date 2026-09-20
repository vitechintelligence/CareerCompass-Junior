import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { STEAM_STUDIOS, COMMUNITY_BRIDGE_MISSIONS } from "@/lib/steam-missions";
import { LEARNER_AGE_BANDS, LEARNER_AGE_PROFILES } from "@/lib/learner-age-bands";

export default function SteamLabPage() {
  return (
    <main className="workspacePage">
      <header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><div><strong>STEAM LAB</strong><div className="muted" style={{ fontSize: 12 }}>Experiential missions · not subject quizzes</div></div><Link className="pill" href="/workspace/student">Student Workspace</Link></header>
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div><div className="eyebrow">Interactive creative laboratory</div><h1 className="workspaceHeroTitle">Solve a problem. Build an idea. See what happens. Improve it.</h1><p className="muted">Science, technology, engineering, arts and mathematics work together inside real-world missions. Arts includes design, storytelling, user experience, communication, empathy and aesthetics — not just decoration.</p></div>
          <Link className="button primary" href="/steam-lab/community-bridge?age=10-13">Open Community Bridge</Link>
        </section>

        <section className="cardGrid">
          {STEAM_STUDIOS.map((studio) => <article className="card" key={studio.key}><span style={{ fontSize: 32 }}>{studio.icon}</span><h2>{studio.labelEn}</h2><p className="muted">Missions can combine this studio with several others. Studios are lenses, not isolated subjects.</p></article>)}
        </section>

        <section className="panel">
          <div className="eyebrow">Proof of concept · live mission architecture</div><h2 className="workspaceTitle">Community Bridge Designer</h2>
          <p className="muted">One mission, four genuinely different experience levels. The language, constraints, reflection depth and evidence expectations change with the learner.</p>
          <div className="workspaceList">{LEARNER_AGE_BANDS.map((key) => {
            const profile = LEARNER_AGE_PROFILES[key];
            const mission = COMMUNITY_BRIDGE_MISSIONS[key];
            return <div className="workspaceRow" key={key}><div><strong>{profile.ageLabelEn} · {profile.gradeLabelEn} · {profile.experienceNameEn}</strong><div className="muted">{mission.missionPromptEn}</div></div><Link className="button soft" href={`/steam-lab/community-bridge?age=${key}`}>Try level</Link></div>;
          })}</div>
        </section>

        <section className="panel">
          <div className="eyebrow">Next missions on the same runtime</div><div className="miniGrid"><div className="miniCard light"><strong>🤖 Robot Rescue</strong><span>Visual logic, route planning, debugging and redesign.</span></div><div className="miniCard light"><strong>🌱 Future Farm</strong><span>Resources, ecosystems, sensors, irrigation and sustainable design.</span></div><div className="miniCard light"><strong>🏙️ Smart City</strong><span>Systems thinking across transport, water, energy, waste and green space.</span></div><div className="miniCard light"><strong>💡 Invention Studio</strong><span>Human-centered problem finding, prototyping, testing and presentation.</span></div></div>
        </section>
      </div>
    </main>
  );
}
