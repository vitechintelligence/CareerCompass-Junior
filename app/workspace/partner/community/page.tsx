import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import {
  COMMUNITY_CHALLENGE_LIBRARY,
  QUARTERLY_FORMAT,
  challengeModeLabel,
  type ParticipationMode,
} from "@/lib/community-challenges";
import type { FutureSkillsAgeBand, FutureSkillsTrack } from "@/lib/future-skills-curriculum";
import {
  addCommunityChallenge,
  approveCommunityShowcase,
  assignCommunityAdvisor,
  createCommunitySeason,
  publishCommunityResult,
  updateCommunitySeasonControls,
  updateCommunitySeasonStatus,
} from "./actions";

export const dynamic = "force-dynamic";

const TRACKS: Array<{ key: FutureSkillsTrack; label: string }> = [
  { key: "stem", label: "STEM" },
  { key: "steam", label: "STEAM" },
  { key: "ai-foundation", label: "AI Foundations" },
  { key: "ai-level-2", label: "AI Level 2" },
  { key: "robotics", label: "Robotics" },
];
const AGES: FutureSkillsAgeBand[] = ["7-9","10-12","13-15","16-18"];
const MODES: ParticipationMode[] = ["individual","small_group","large_group"];

export default async function PartnerCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; track?: string; age?: string; mode?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return <Gate copy="Sign in with an approved partner administrator account." />;

  const profile = await getCurrentProfile();
  if (!profile || !["partner_admin","platform_admin"].includes(profile.account_type)) {
    return <Gate copy="Partner administrator access is required to control community competitions." />;
  }

  const sql = getDb();
  const organizations = profile.account_type === "platform_admin"
    ? await sql`select id, name from organizations where status='active' order by name`
    : await sql`
        select o.id, o.name
        from organization_memberships om
        join organizations o on o.id=om.organization_id
        where om.profile_id=${profile.id}
          and om.role='partner_admin'
          and om.status='active'
          and o.status='active'
        order by o.name
      `;

  const organization = organizations[0];
  if (!organization) return <Gate copy="No active partner organization is attached to this account." />;
  const organizationId = String(organization.id);
  const params = await searchParams;

  const seasons = await sql`
    select *
    from community_seasons
    where organization_id=${organizationId}
    order by year desc, quarter desc, created_at desc
  `;
  const selectedSeason = seasons.find((item) => String(item.id) === params.season) ?? seasons[0] ?? null;
  const seasonId = selectedSeason ? String(selectedSeason.id) : "";

  const [challenges, teams, advisors, teachers] = await Promise.all([
    seasonId ? sql`
      select cc.*,
        (select count(*)::int from community_teams ct where ct.challenge_id=cc.id and ct.status <> 'archived') as team_count
      from community_challenges cc
      where cc.season_id=${seasonId}
      order by cc.track, cc.age_band, cc.participation_mode, cc.created_at
    ` : [],
    seasonId ? sql`
      select ct.id, ct.team_name, ct.status, ct.partner_approved_showcase, ct.showcase_visibility,
        cc.title_en as challenge_title, cc.participation_mode,
        (select count(*)::int from community_team_members ctm where ctm.team_id=ct.id and ctm.status='active') as member_count,
        (select cs.id from community_submissions cs where cs.team_id=ct.id order by cs.version_number desc limit 1) as latest_submission_id,
        (select count(*)::int from community_feedback cf join community_submissions cs on cs.id=cf.submission_id where cs.team_id=ct.id) as feedback_count
      from community_teams ct
      join community_challenges cc on cc.id=ct.challenge_id
      where cc.season_id=${seasonId}
      order by ct.updated_at desc
    ` : [],
    seasonId ? sql`
      select ca.advisor_role, p.semantic_id, p.display_name
      from community_advisors ca
      join profiles p on p.id=ca.advisor_profile_id
      where ca.season_id=${seasonId} and ca.status='active'
      order by p.display_name nulls last, p.semantic_id
    ` : [],
    sql`
      select distinct p.semantic_id, p.display_name
      from organization_memberships om
      join profiles p on p.id=om.profile_id
      where om.organization_id=${organizationId}
        and om.role='teacher'
        and om.status='active'
        and p.account_type='teacher'
        and p.status='active'
      order by p.display_name nulls last, p.semantic_id
    `,
  ]);

  const track = TRACKS.some((item) => item.key === params.track) ? params.track as FutureSkillsTrack : "robotics";
  const age = AGES.includes(params.age as FutureSkillsAgeBand) ? params.age as FutureSkillsAgeBand : "10-12";
  const mode = MODES.includes(params.mode as ParticipationMode) ? params.mode as ParticipationMode : "small_group";
  const templates = COMMUNITY_CHALLENGE_LIBRARY.filter(
    (item) => item.track === track && item.ageBand === age && item.participationMode === mode,
  );

  const now = new Date();
  const defaultYear = now.getUTCFullYear();
  const defaultQuarter = Math.floor(now.getUTCMonth() / 3) + 1;

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/workspace/partner"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>Community & Quarterly Challenges</strong><div className="muted" style={{ fontSize: 12 }}>Partner-controlled build · review · showcase</div></div>
        <Link className="pill" href="/workspace/partner">Partner Workspace</Link>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">Developer-style learner community</div>
            <h1 className="workspaceHeroTitle">{String(organization.name)} Challenge Studio</h1>
            <p className="muted">Run quarterly competitions where learners build, test, improve, get advisor feedback and showcase what they can do. Partners control participation, visibility, advisors, rankings and publication.</p>
          </div>
          <span className="pill">{seasons.length} season{seasons.length === 1 ? "" : "s"}</span>
        </section>

        <section className="panel">
          <div className="eyebrow">Quarterly rhythm</div>
          <div className="communityStageGrid">
            {QUARTERLY_FORMAT.map((item) => <div className="miniCard light" key={item.stage}><strong>{item.stage} · weeks {item.weeks}</strong><span>{item.en}</span></div>)}
          </div>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Create a season</div>
            <h2 className="workspaceTitle">Quarterly competition</h2>
            <form action={createCommunitySeason} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label><span>English title</span><input name="titleEn" defaultValue={`Q${defaultQuarter} Future Builders`} maxLength={160} required /></label>
              <label><span>Vietnamese title</span><input name="titleVi" defaultValue={`Thử thách Nhà sáng tạo Quý ${defaultQuarter}`} maxLength={160} required /></label>
              <div className="inlineFields">
                <label><span>Year</span><input name="year" type="number" min="2025" max="2100" defaultValue={defaultYear} required /></label>
                <label><span>Quarter</span><select name="quarter" defaultValue={String(defaultQuarter)}><option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option></select></label>
              </div>
              <label><span>Theme EN</span><input name="themeEn" placeholder="Build something useful. Explain the evidence." maxLength={500} /></label>
              <label><span>Theme VI</span><input name="themeVi" placeholder="Xây điều hữu ích. Giải thích bằng minh chứng." maxLength={500} /></label>
              <div className="communityCheckGrid">
                {TRACKS.map((item) => <label className="communityCheck" key={item.key}><input type="checkbox" name="tracks" value={item.key} defaultChecked /><span>{item.label}</span></label>)}
              </div>
              <div className="communityCheckGrid">
                {AGES.map((item) => <label className="communityCheck" key={item}><input type="checkbox" name="ageBands" value={item} defaultChecked /><span>Ages {item}</span></label>)}
              </div>
              <div className="inlineFields">
                <label><span>Starts</span><input name="startsOn" type="date" required /></label>
                <label><span>Submission due</span><input name="submissionDueOn" type="date" required /></label>
              </div>
              <label><span>Showcase date</span><input name="showcaseOn" type="date" /></label>
              <div className="inlineFields">
                <label><span>Leaderboard</span><select name="leaderboardMode" defaultValue="podium_only"><option value="hidden">Hidden</option><option value="podium_only">Podium only</option><option value="full">Full leaderboard</option></select></label>
                <label><span>Season max team size</span><input name="maxTeamSize" type="number" min="1" max="30" defaultValue="10" /></label>
              </div>
              <label className="communityCheck"><input type="checkbox" name="allowStudentTeamCreation" defaultChecked /><span>Students may create teams</span></label>
              <label className="communityCheck"><input type="checkbox" name="allowPeerKudos" defaultChecked /><span>Enable structured peer kudos during showcase</span></label>
              <label className="communityCheck"><input type="checkbox" name="advisorFeedbackRequired" defaultChecked /><span>Require advisor feedback before showcase</span></label>
              <label className="communityCheck"><input type="checkbox" name="publishAdvisorFeedback" /><span>Allow advisor feedback to appear in showcase</span></label>
              <button className="button primary" type="submit">Create quarterly season</button>
            </form>
          </article>

          <article className="panel">
            <div className="eyebrow">Season switcher</div>
            <h2 className="workspaceTitle">Manage a season</h2>
            {seasons.length === 0 ? <Empty text="Create the first quarterly season. Nothing is public until you open it." /> : (
              <>
                <div className="workspaceList">
                  {seasons.map((item) => <Link className="workspaceRow" key={String(item.id)} href={filterHref(String(item.id), track, age, mode)}><div><strong>Q{String(item.quarter)} {String(item.year)} · {String(item.title_en)}</strong><div className="muted">{String(item.status)} · {String(item.visibility).replace("_"," ")}</div></div><span className="pill">{String(item.leaderboard_mode).replace("_"," ")}</span></Link>)}
                </div>
                {selectedSeason && <form action={updateCommunitySeasonStatus} className="workspaceForm">
                  <input type="hidden" name="seasonId" value={seasonId} />
                  <label><span>Season stage</span><select name="status" defaultValue={String(selectedSeason.status)}><option value="draft">Draft</option><option value="open">Open for builds</option><option value="review">Advisor review</option><option value="showcase">Showcase</option><option value="closed">Closed</option></select></label>
                  <button className="button soft" type="submit">Update stage</button>
                </form>}
              </>
            )}
          </article>
        </section>

        {selectedSeason && <>
          <section className="workspaceGrid">
            <article className="panel">
              <div className="eyebrow">Partner controls</div>
              <h2 className="workspaceTitle">Competition settings</h2>
              <form action={updateCommunitySeasonControls} className="workspaceForm">
                <input type="hidden" name="seasonId" value={seasonId} />
                <div className="inlineFields">
                  <label><span>Leaderboard</span><select name="leaderboardMode" defaultValue={String(selectedSeason.leaderboard_mode)}><option value="hidden">Hidden</option><option value="podium_only">Podium only</option><option value="full">Full leaderboard</option></select></label>
                  <label><span>Maximum team size</span><input name="maxTeamSize" type="number" min="1" max="30" defaultValue={Number(selectedSeason.max_team_size || 5)} /></label>
                </div>
                <label><span>Showcase reach</span><select name="visibility" defaultValue={String(selectedSeason.visibility) === "network" ? "organization" : String(selectedSeason.visibility)}><option value="organization">Institution only</option><option value="network_pending">Request ViTech network showcase review</option></select></label>
                <label className="communityCheck"><input type="checkbox" name="allowStudentTeamCreation" defaultChecked={Boolean(selectedSeason.allow_student_team_creation)} /><span>Students may create teams</span></label>
                <label className="communityCheck"><input type="checkbox" name="allowPeerKudos" defaultChecked={Boolean(selectedSeason.allow_peer_kudos)} /><span>Structured peer kudos</span></label>
                <label className="communityCheck"><input type="checkbox" name="advisorFeedbackRequired" defaultChecked={Boolean(selectedSeason.advisor_feedback_required)} /><span>Advisor feedback required</span></label>
                <label className="communityCheck"><input type="checkbox" name="publishAdvisorFeedback" defaultChecked={Boolean(selectedSeason.publish_advisor_feedback)} /><span>Feedback may appear in showcase</span></label>
                <button className="button soft" type="submit">Save competition controls</button>
              </form>
            </article>

            <article className="panel">
              <div className="eyebrow">Advisor bench</div>
              <h2 className="workspaceTitle">Mentors & judges</h2>
              {teachers.length === 0 ? <Empty text="Activate teacher accounts first; active teachers can become advisors or judges." /> : <div className="muted">Available: {teachers.map((item) => String(item.display_name || item.semantic_id)).join(" · ")}</div>}
              <form action={assignCommunityAdvisor} className="workspaceForm">
                <input type="hidden" name="seasonId" value={seasonId} />
                <label><span>Teacher semantic ID</span><input name="advisorSemanticId" maxLength={100} placeholder="vn-learner-…" required /></label>
                <label><span>Role</span><select name="advisorRole" defaultValue="mentor_judge"><option value="mentor">Mentor</option><option value="judge">Judge</option><option value="mentor_judge">Mentor + judge</option></select></label>
                <button className="button soft" type="submit">Assign advisor</button>
              </form>
              {advisors.length > 0 && <div className="workspaceList">{advisors.map((item) => <div className="workspaceRow" key={String(item.semantic_id)}><div><strong>{String(item.display_name || item.semantic_id)}</strong><div className="muted">{String(item.semantic_id)}</div></div><span className="pill">{String(item.advisor_role).replace("_"," + ")}</span></div>)}</div>}
            </article>
          </section>

          <section className="panel">
            <div className="eyebrow">Challenge library</div>
            <h2 className="workspaceTitle">Individual · small group · large group activities for every Future Skills unit</h2>
            <div className="communityFilters">
              <div className="actions">{TRACKS.map((item) => <Link className={`button ${track === item.key ? "primary" : ""}`} href={filterHref(seasonId,item.key,age,mode)} key={item.key}>{item.label}</Link>)}</div>
              <div className="actions">{AGES.map((item) => <Link className={`button ${age === item ? "primary" : ""}`} href={filterHref(seasonId,track,item,mode)} key={item}>{item}</Link>)}</div>
              <div className="actions">{MODES.map((item) => <Link className={`button ${mode === item ? "primary" : ""}`} href={filterHref(seasonId,track,age,item)} key={item}>{challengeModeLabel(item)}</Link>)}</div>
            </div>
            <div className="workspaceList" style={{ marginTop: 16 }}>
              {templates.map((item) => <form action={addCommunityChallenge} className="communityTemplateCard" key={item.templateKey}>
                <input type="hidden" name="seasonId" value={seasonId} />
                <input type="hidden" name="templateKey" value={item.templateKey} />
                <div>
                  <div className="tagRow"><span className="tag">{item.track.toUpperCase()}</span><span className="tag">Ages {item.ageBand}</span><span className="tag">{challengeModeLabel(item.participationMode)}</span><span className="tag">{item.minTeamSize}–{item.maxTeamSize} learner{item.maxTeamSize === 1 ? "" : "s"}</span></div>
                  <strong>{item.titleEn}</strong>
                  <p className="muted">{item.briefEn}</p>
                  <div className="tagRow">{item.skillsFocus.slice(0,6).map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
                </div>
                <button className="button primary" type="submit">Add to this quarter</button>
              </form>)}
            </div>
          </section>

          <section className="workspaceGrid">
            <article className="panel">
              <div className="eyebrow">Live challenge set</div>
              <h2 className="workspaceTitle">{challenges.length} configured challenge{challenges.length === 1 ? "" : "s"}</h2>
              {challenges.length === 0 ? <Empty text="Add activities from the challenge library above." /> : <div className="workspaceList">{challenges.map((item) => <div className="workspaceRow" key={String(item.id)}><div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.track)} · ages {String(item.age_band)} · {String(item.participation_mode).replace("_"," ")} · {String(item.team_count)} team(s)</div></div><span className="pill">{String(item.status)}</span></div>)}</div>}
            </article>

            <article className="panel">
              <div className="eyebrow">Build teams & showcase</div>
              <h2 className="workspaceTitle">{teams.length} participating team{teams.length === 1 ? "" : "s"}</h2>
              {teams.length === 0 ? <Empty text="Teams will appear when students join an open challenge." /> : <div className="workspaceList">{teams.map((team) => <div className="feedbackCard" key={String(team.id)}>
                <strong>{String(team.team_name)}</strong>
                <div className="muted">{String(team.challenge_title)} · {String(team.member_count)} member(s) · {String(team.feedback_count)} feedback item(s)</div>
                <div className="tagRow"><span className="tag">{String(team.status)}</span><span className="tag">{String(team.participation_mode).replace("_"," ")}</span>{team.latest_submission_id && <span className="tag">submission ready</span>}</div>
                {team.latest_submission_id && <div className="actions">
                  <form action={approveCommunityShowcase}><input type="hidden" name="teamId" value={String(team.id)} /><input type="hidden" name="scope" value="organization" /><button className="button soft" type="submit">Approve institution showcase</button></form>
                  <form action={approveCommunityShowcase}><input type="hidden" name="teamId" value={String(team.id)} /><input type="hidden" name="scope" value="network_pending" /><button className="button" type="submit">Request network showcase</button></form>
                </div>}
                <form action={publishCommunityResult} className="inlineFields">
                  <input type="hidden" name="seasonId" value={seasonId} />
                  <input type="hidden" name="teamId" value={String(team.id)} />
                  <input name="awardLabel" placeholder="Award: Best Iteration / Champion…" maxLength={120} required />
                  <input name="placement" type="number" min="1" max="1000" placeholder="Place" />
                  <button className="button soft" type="submit">Publish recognition</button>
                </form>
              </div>)}</div>}
            </article>
          </section>
        </>}
      </div>
    </main>
  );
}

function filterHref(season: string, track: FutureSkillsTrack, age: FutureSkillsAgeBand, mode: ParticipationMode) {
  const query = new URLSearchParams({ season, track, age, mode });
  return `/workspace/partner/community?${query.toString()}`;
}

function Empty({ text }: { text: string }) {
  return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>;
}

function Gate({ copy }: { copy: string }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Community Studio</strong><Link className="pill" href="/workspace/partner">Partner Workspace</Link></header><div className="workspaceContent"><section className="panel gatePanel"><h2>Partner controls required</h2><p className="muted">{copy}</p></section></div></main>;
}
