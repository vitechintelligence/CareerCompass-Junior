import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { LEARNER_AGE_PROFILES, type LearnerAgeBand } from "@/lib/learner-age-bands";
import { COMMUNITY_KUDOS, challengeModeLabel } from "@/lib/community-challenges";
import { createCommunityTeam, giveCommunityKudos, joinCommunityTeam, submitCommunityProject } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return <Gate signedIn={false} />;

  const profile = await getCurrentProfile();
  if (!profile || profile.account_type !== "student") return <Gate signedIn />;

  const sql = getDb();
  const schemaRows = await sql`select to_regclass('public.community_student_access') as access_table`;
  if (!schemaRows[0]?.access_table) {
    return <main className="workspacePage"><Header /><div className="workspaceContent"><section className="statusBanner"><strong>Community access is being prepared.</strong><span>The school-controlled community migration has not been activated yet.</span></section></div></main>;
  }

  const access = await sql`
    select csa.organization_id, csa.age_band, o.name as organization_name
    from community_student_access csa
    join organizations o on o.id=csa.organization_id
    where csa.student_id=${profile.id}
      and csa.status='enabled'
      and csa.guardian_consent_confirmed=true
      and csa.learner_acknowledged=true
      and o.status='active'
    order by csa.updated_at desc
    limit 1
  `;
  const accessRow = access[0];
  if (!accessRow) return <Gate signedIn copy="Your school or teacher has not enabled community participation for this account yet." />;

  const organizationId = String(accessRow.organization_id);
  const ageBand = String(accessRow.age_band) as LearnerAgeBand;
  const ageProfile = LEARNER_AGE_PROFILES[ageBand];
  const params = await searchParams;

  const seasons = await sql`
    select *
    from community_seasons
    where organization_id=${organizationId}
      and status in ('open','review','showcase','closed')
      and ${ageBand}=any(age_bands)
    order by year desc, quarter desc, created_at desc
  `;
  const selectedSeason = seasons.find((item) => String(item.id) === params.season) ?? seasons[0] ?? null;
  const seasonId = selectedSeason ? String(selectedSeason.id) : "";

  const [challenges, myTeams, showcases, results] = await Promise.all([
    seasonId ? sql`
      select cc.*,
        (select count(*)::int from community_teams ct where ct.challenge_id=cc.id and ct.status <> 'archived') as team_count
      from community_challenges cc
      where cc.season_id=${seasonId}
        and cc.age_band=${ageBand}
        and cc.status in ('open','closed')
      order by cc.participation_mode, cc.created_at
    ` : [],
    seasonId ? sql`
      select ct.id, ct.team_name, ct.join_code, ct.status, ct.project_title,
        cc.title_en as challenge_title, cc.brief_en, cc.participation_mode,
        cc.min_team_size, cc.max_team_size,
        (select count(*)::int from community_team_members ctm2 where ctm2.team_id=ct.id and ctm2.status='active') as member_count,
        (select cs.id from community_submissions cs where cs.team_id=ct.id order by cs.version_number desc limit 1) as submission_id,
        (select cs.version_number from community_submissions cs where cs.team_id=ct.id order by cs.version_number desc limit 1) as submission_version,
        (select cs.status from community_submissions cs where cs.team_id=ct.id order by cs.version_number desc limit 1) as submission_status
      from community_team_members ctm
      join community_teams ct on ct.id=ctm.team_id
      join community_challenges cc on cc.id=ct.challenge_id
      where ctm.student_id=${profile.id}
        and ctm.status='active'
        and cc.season_id=${seasonId}
        and cc.age_band=${ageBand}
        and ct.status <> 'archived'
      order by ct.updated_at desc
    ` : [],
    seasonId ? sql`
      select ct.id, ct.team_name, ct.project_title, ct.project_summary, ct.demo_url, ct.repository_url,
        cc.title_en as challenge_title, cc.participation_mode,
        cs.title as submission_title, cs.summary as submission_summary, cs.artifact_url,
        (select count(*)::int from community_kudos ck where ck.team_id=ct.id) as kudos_count
      from community_teams ct
      join community_challenges cc on cc.id=ct.challenge_id
      join lateral (
        select *
        from community_submissions latest
        where latest.team_id=ct.id and latest.status='showcase'
        order by latest.version_number desc
        limit 1
      ) cs on true
      where cc.season_id=${seasonId}
        and cc.age_band=${ageBand}
        and ct.partner_approved_showcase=true
        and ct.showcase_visibility in ('organization','network')
      order by ct.updated_at desc
    ` : [],
    seasonId ? sql`
      select cr.placement, cr.award_label, ct.team_name, cc.title_en as challenge_title
      from community_results cr
      join community_teams ct on ct.id=cr.team_id
      join community_challenges cc on cc.id=ct.challenge_id
      where cr.season_id=${seasonId}
        and cc.age_band=${ageBand}
        and cr.published=true
      order by cr.placement asc nulls last, cr.created_at
    ` : [],
  ]);

  const leaderboardMode = String(selectedSeason?.leaderboard_mode || "hidden");
  const visibleResults = leaderboardMode === "hidden"
    ? []
    : leaderboardMode === "podium_only"
      ? results.filter((item) => item.placement && Number(item.placement) <= 3)
      : results;

  const myTeamIds = new Set(myTeams.map((item) => String(item.id)));

  return (
    <main className="workspacePage">
      <Header />
      <div className="workspaceContent">
        <section className="communityHero">
          <div>
            <div className="eyebrow">Your school community</div>
            <h1 className="workspaceHeroTitle">Build something. Test it. Improve it. Show what you learned.</h1>
            <p className="muted">{ageProfile.languageEn}</p>
          </div>
          <div className="communityHeroBadge"><strong>{String(accessRow.organization_name)}</strong><span>{ageProfile.ageLabelEn} · {ageProfile.gradeLabelEn}</span></div>
        </section>

        {seasons.length === 0 ? <section className="panel"><Empty text="Your school has not opened a challenge for your age level yet." /></section> : <>
          <section className="panel">
            <div className="eyebrow">Quarterly seasons</div>
            <div className="actions">{seasons.map((season) => <Link className={`button ${String(season.id) === seasonId ? "primary" : ""}`} key={String(season.id)} href={`/workspace/student/community?season=${encodeURIComponent(String(season.id))}`}>Q{String(season.quarter)} {String(season.year)}</Link>)}</div>
          </section>

          {selectedSeason && <section className="workspaceIdentity">
            <div><div className="eyebrow">Q{String(selectedSeason.quarter)} · {String(selectedSeason.status)}</div><h2 className="workspaceHeroTitle">{String(selectedSeason.title_en)}</h2><p className="muted">{String(selectedSeason.theme_en || "Explore, build, test, improve and explain.")}</p></div>
            <span className="pill">{ageProfile.experienceNameEn}</span>
          </section>}

          {String(selectedSeason?.status) === "open" && <section className="workspaceGrid">
            <article className="panel">
              <div className="eyebrow">Join a team</div><h2 className="workspaceTitle">Have a team code?</h2>
              <form action={joinCommunityTeam} className="communityJoinForm"><input name="joinCode" maxLength={12} placeholder="TEAM CODE" required /><button className="button primary" type="submit">Join team</button></form>
            </article>
            <article className="panel">
              <div className="eyebrow">Your level</div><h2 className="workspaceTitle">{ageProfile.ageLabelEn}</h2>
              <p className="muted">{ageProfile.scaffoldingEn.join(" · ")}</p>
            </article>
          </section>}

          <section className="panel">
            <div className="eyebrow">Challenge board</div>
            <h2 className="workspaceTitle">Choose an individual, small-group or large-group build.</h2>
            {challenges.length === 0 ? <Empty text="No challenge is open for your age level yet." /> : <div className="communityChallengeGrid">{challenges.map((challenge) => {
              const joined = myTeams.some((team) => String(team.challenge_title) === String(challenge.title_en));
              return <article className="communityChallengeCard" key={String(challenge.id)}>
                <div className="tagRow"><span className="tag">Integrated STEAM</span><span className="tag">{challengeModeLabel(String(challenge.participation_mode) as "individual" | "small_group" | "large_group")}</span></div>
                <h3>{String(challenge.title_en)}</h3>
                <p className="muted">{String(challenge.brief_en)}</p>
                <div className="communityChallengeStats"><span>{String(challenge.min_team_size)}–{String(challenge.max_team_size)} learner(s)</span><span>{String(challenge.team_count)} team(s)</span></div>
                {String(challenge.status) === "open" && Boolean(selectedSeason?.allow_student_team_creation) && !joined && <form action={createCommunityTeam} className="workspaceForm">
                  <input type="hidden" name="challengeId" value={String(challenge.id)} />
                  <label><span>{String(challenge.participation_mode) === "individual" ? "Project name" : "Team name"}</span><input name="teamName" maxLength={80} placeholder={String(challenge.participation_mode) === "individual" ? "My bridge idea" : "Bridge Builders"} required={String(challenge.participation_mode) !== "individual"} /></label>
                  <button className="button soft" type="submit">{String(challenge.participation_mode) === "individual" ? "Start solo build" : "Create team"}</button>
                </form>}
              </article>;
            })}</div>}
          </section>

          <section className="panel">
            <div className="eyebrow">My builds</div>
            <h2 className="workspaceTitle">Submit, improve and try again.</h2>
            {myTeams.length === 0 ? <Empty text="Join or create a challenge to start building." /> : <div className="workspaceList">{myTeams.map((team) => <article className="communityTeamCard" key={String(team.id)}>
              <div className="workspaceRow communityTeamHead"><div><strong>{String(team.team_name)}</strong><div className="muted">{String(team.challenge_title)} · {String(team.member_count)} member(s)</div></div><div className="tagRow"><span className="tag">{String(team.status)}</span><span className="tag">Join: {String(team.join_code)}</span></div></div>
              <p className="muted">{String(team.brief_en)}</p>
              {["open","review"].includes(String(selectedSeason?.status)) && <form action={submitCommunityProject} className="workspaceForm">
                <input type="hidden" name="teamId" value={String(team.id)} />
                <label><span>Project title</span><input name="title" defaultValue={String(team.project_title || "")} maxLength={180} required /></label>
                <label><span>What did you build?</span><textarea name="summary" rows={3} maxLength={4000} placeholder="Describe the idea, what happened in testing and what evidence you saw." required /></label>
                <label><span>What changed after testing or feedback?</span><textarea name="reflection" rows={2} maxLength={4000} placeholder="Attempt 1 → observation → change → improved attempt" /></label>
                <div className="communityLinkGrid"><label><span>Artifact link</span><input name="artifactUrl" type="url" placeholder="https://…" /></label><label><span>Demo link</span><input name="demoUrl" type="url" placeholder="https://…" /></label><label><span>Project / repo link</span><input name="repositoryUrl" type="url" placeholder="https://…" /></label></div>
                <button className="button primary" type="submit">{team.submission_id ? "Submit improved version" : "Submit build for review"}</button>
              </form>}
              {team.submission_id && <div className="statusBanner"><strong>Version {String(team.submission_version)} · {String(team.submission_status)}</strong><span>Improvement is part of your learning evidence — a weaker first attempt is not treated as failure.</span></div>}
            </article>)}</div>}
          </section>

          {String(selectedSeason?.status) === "showcase" && <section className="panel">
            <div className="eyebrow">Showcase</div><h2 className="workspaceTitle">See what your community built.</h2>
            {showcases.length === 0 ? <Empty text="Your school is still curating showcase entries." /> : <div className="communityShowcaseGrid">{showcases.map((item) => <article className="communityShowcaseCard" key={String(item.id)}>
              <div className="tagRow"><span className="tag">STEAM</span><span className="tag">{challengeModeLabel(String(item.participation_mode) as "individual" | "small_group" | "large_group")}</span></div>
              <h3>{String(item.project_title || item.submission_title || item.team_name)}</h3><strong>{String(item.team_name)}</strong><p className="muted">{String(item.submission_summary || item.project_summary)}</p>
              <div className="actions">{item.demo_url && <a className="button soft" href={String(item.demo_url)} target="_blank" rel="noreferrer">Open demo ↗</a>}{item.artifact_url && <a className="button" href={String(item.artifact_url)} target="_blank" rel="noreferrer">View artifact ↗</a>}{item.repository_url && <a className="button" href={String(item.repository_url)} target="_blank" rel="noreferrer">Project ↗</a>}</div>
              <div className="communityKudosRow"><strong>{String(item.kudos_count)} kudos</strong>{Boolean(selectedSeason?.allow_peer_kudos) && !myTeamIds.has(String(item.id)) && COMMUNITY_KUDOS.map((kudo) => <form action={giveCommunityKudos} key={kudo.key}><input type="hidden" name="teamId" value={String(item.id)} /><input type="hidden" name="kind" value={kudo.key} /><button className="kudoButton" type="submit" title={kudo.labelEn}>{kudo.icon} {kudo.labelEn}</button></form>)}</div>
            </article>)}</div>}
          </section>}

          {visibleResults.length > 0 && <section className="panel">
            <div className="eyebrow">Recognition</div><h2 className="workspaceTitle">{leaderboardMode === "podium_only" ? "Quarterly podium" : "Published results"}</h2>
            <div className="workspaceList">{visibleResults.map((result) => <div className="workspaceRow" key={`${String(result.team_name)}-${String(result.award_label)}`}><div><strong>{result.placement ? `#${String(result.placement)} · ` : ""}{String(result.team_name)}</strong><div className="muted">{String(result.challenge_title)}</div></div><span className="pill">{String(result.award_label)}</span></div>)}</div>
          </section>}
        </>}
      </div>
    </main>
  );
}

function Header() {
  return <header className="topbar"><Link className="brand" href="/workspace/student"><VitechMark /><span>Career Compass Junior</span></Link><div><strong>Build Community</strong><div className="muted" style={{ fontSize: 12 }}>School-approved · age-levelled · moderated</div></div><Link className="pill" href="/workspace/student">Student Workspace</Link></header>;
}

function Empty({ text }: { text: string }) {
  return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>;
}

function Gate({ signedIn, copy }: { signedIn: boolean; copy?: string }) {
  return <main className="workspacePage"><Header /><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Community access not enabled" : "Sign in to the learner community"}</h2><p className="muted">{copy || (signedIn ? "Your school or teacher must enable your community access before you can join." : "Sign in to join school-approved builds and showcases.")}</p>{!signedIn && <Link className="button primary" href="/auth/sign-in?callbackURL=%2Fworkspace%2Fstudent%2Fcommunity">Sign in</Link>}</section></div></main>;
}
