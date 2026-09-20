import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { hasCurrentCommunityAgreement } from "@/lib/community-access";
import { LEARNER_AGE_BANDS, LEARNER_AGE_PROFILES, type LearnerAgeBand } from "@/lib/learner-age-bands";
import { COMMUNITY_CHALLENGE_LIBRARY, QUARTERLY_FORMAT, challengeModeLabel, type ParticipationMode } from "@/lib/community-challenges";
import { CommunityAgreementPanel } from "@/app/workspace/community/CommunityAgreementPanel";
import { setCommunityStudentAccess, setTeacherCommunityPermissions } from "@/app/workspace/community/actions";
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

const MODES: ParticipationMode[] = ["individual","small_group","large_group"];

export default async function PartnerCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; age?: string; mode?: string; lang?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return <Gate copy="Sign in with an approved partner administrator account." />;

  const profile = await getCurrentProfile();
  if (!profile || !["partner_admin","platform_admin"].includes(profile.account_type)) {
    return <Gate copy="School administrator access is required to control community rules, teacher delegation and publication." />;
  }

  const sql = getDb();
  const organizations = profile.account_type === "platform_admin"
    ? await sql`select id, name, locale from organizations where status='active' order by name`
    : await sql`
        select o.id, o.name, o.locale
        from organization_memberships om
        join organizations o on o.id=om.organization_id
        where om.profile_id=${profile.id}
          and om.role='partner_admin'
          and om.status='active'
          and o.status='active'
        order by o.name
      `;
  const organization = organizations[0];
  if (!organization) return <Gate copy="No active partner institution is attached to this account." />;
  const organizationId = String(organization.id);
  const params = await searchParams;
  const locale = params.lang === "en" ? "en" : params.lang === "vi" ? "vi" : String(organization.locale) === "en" ? "en" : "vi";

  const schemaRows = await sql`select to_regclass('public.community_seasons') as seasons, to_regclass('public.community_agreement_acceptances') as agreements`;
  const schemaReady = Boolean(schemaRows[0]?.seasons && schemaRows[0]?.agreements);

  if (!schemaReady) {
    return (
      <main className="workspacePage">
        <CommunityHeader locale={locale} />
        <div className="workspaceContent">
          <section className="workspaceIdentity">
            <div><div className="eyebrow">Community governance prepared</div><h1 className="workspaceHeroTitle">{String(organization.name)} Community Studio</h1><p className="muted">The code and database migration are prepared, but Migration 005 has not been applied to production. The community remains unavailable until the migration is explicitly reviewed and approved.</p></div>
          </section>
          <section className="statusBanner"><strong>Safe hold</strong><span>No partner or learner data has been written to the new community tables yet.</span></section>
        </div>
      </main>
    );
  }

  const agreementAccepted = await hasCurrentCommunityAgreement(organizationId, profile.id);
  const seasons = await sql`
    select *
    from community_seasons
    where organization_id=${organizationId}
    order by year desc, quarter desc, created_at desc
  `;
  const selectedSeason = seasons.find((item) => String(item.id) === params.season) ?? seasons[0] ?? null;
  const seasonId = selectedSeason ? String(selectedSeason.id) : "";

  const age: LearnerAgeBand = LEARNER_AGE_BANDS.includes(params.age as LearnerAgeBand)
    ? params.age as LearnerAgeBand
    : "10-13";
  const mode: ParticipationMode = MODES.includes(params.mode as ParticipationMode)
    ? params.mode as ParticipationMode
    : "small_group";
  const templates = COMMUNITY_CHALLENGE_LIBRARY.filter((item) => item.ageBand === age && item.participationMode === mode);

  const [challenges, teams, advisors, teachers, accessRows, delegated] = await Promise.all([
    seasonId ? sql`
      select cc.*,
        (select count(*)::int from community_teams ct where ct.challenge_id=cc.id and ct.status <> 'archived') as team_count
      from community_challenges cc
      where cc.season_id=${seasonId}
      order by cc.age_band, cc.participation_mode, cc.created_at
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
    sql`
      select csa.age_band, csa.status, p.semantic_id, p.display_name
      from community_student_access csa
      join profiles p on p.id=csa.student_id
      where csa.organization_id=${organizationId}
      order by csa.updated_at desc
      limit 12
    `,
    sql`
      select csp.can_initiate_seasons, csp.can_enable_students, csp.can_moderate, csp.can_assign_advisors,
        p.semantic_id, p.display_name
      from community_staff_permissions csp
      join profiles p on p.id=csp.teacher_id
      where csp.organization_id=${organizationId}
      order by p.display_name nulls last, p.semantic_id
    `,
  ]);

  const now = new Date();
  const defaultYear = now.getUTCFullYear();
  const defaultQuarter = Math.floor(now.getUTCMonth() / 3) + 1;
  const activeAgeProfile = LEARNER_AGE_PROFILES[age];

  return (
    <main className="workspacePage">
      <CommunityHeader locale={locale} />
      {!agreementAccepted && <CommunityAgreementPanel organizationId={organizationId} locale={locale} />}
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">School-controlled learner community</div>
            <h1 className="workspaceHeroTitle">{String(organization.name)} Challenge Studio</h1>
            <p className="muted">The institution controls who joins, teacher permissions, age levels, moderation, advisor access, competition rules and what may be showcased. Wider network publication is never automatic.</p>
          </div>
          <div className="actions"><Link className="button" href="/workspace/partner/data-control">Data & AI Control</Link><span className="pill">{seasons.length} season{seasons.length === 1 ? "" : "s"}</span></div>
        </section>

        <section className="panel">
          <div className="eyebrow">Four separate learner levels</div>
          <div className="communityStageGrid">
            {LEARNER_AGE_BANDS.map((key) => {
              const item = LEARNER_AGE_PROFILES[key];
              return <div className="miniCard light" key={key}><strong>{item.ageLabelEn} · {item.gradeLabelEn}</strong><span>{item.experienceNameEn}</span><span>{item.languageEn}</span></div>;
            })}
          </div>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Teacher delegation</div>
            <h2 className="workspaceTitle">School admin decides what teachers can manage.</h2>
            <form action={setTeacherCommunityPermissions} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label><span>Teacher semantic ID</span><input name="teacherSemanticId" required placeholder="vn-learner-…" maxLength={100} /></label>
              <label className="communityCheck"><input type="checkbox" name="canEnableStudents" defaultChecked /><span>Enable approved students to join</span></label>
              <label className="communityCheck"><input type="checkbox" name="canInitiate" /><span>Initiate quarterly seasons</span></label>
              <label className="communityCheck"><input type="checkbox" name="canModerate" /><span>Moderate challenges, rules and showcase</span></label>
              <label className="communityCheck"><input type="checkbox" name="canAssignAdvisors" /><span>Assign advisors / judges</span></label>
              <button className="button soft" type="submit" disabled={!agreementAccepted}>Save teacher permissions</button>
            </form>
            {delegated.length > 0 && <div className="workspaceList">{delegated.map((item) => <div className="workspaceRow" key={String(item.semantic_id)}><div><strong>{String(item.display_name || item.semantic_id)}</strong><div className="muted">{String(item.semantic_id)}</div></div><span className="pill">{[item.can_enable_students && "students",item.can_initiate_seasons && "initiate",item.can_moderate && "moderate",item.can_assign_advisors && "advisors"].filter(Boolean).join(" · ") || "view only"}</span></div>)}</div>}
          </article>

          <article className="panel">
            <div className="eyebrow">Student access</div>
            <h2 className="workspaceTitle">Teacher/admin enables participation by age level.</h2>
            <form action={setCommunityStudentAccess} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label><span>Learner semantic ID</span><input name="studentSemanticId" required placeholder="vn-learner-…" maxLength={100} /></label>
              <label><span>Age / grade experience</span><select name="ageBand" defaultValue="10-13">{LEARNER_AGE_BANDS.map((key) => <option value={key} key={key}>{LEARNER_AGE_PROFILES[key].ageLabelEn} · {LEARNER_AGE_PROFILES[key].gradeLabelEn}</option>)}</select></label>
              <label className="communityCheck"><input type="checkbox" name="guardianConsentConfirmed" required /><span>Institution confirms required parent/guardian permission has been obtained.</span></label>
              <label className="communityCheck"><input type="checkbox" name="learnerAcknowledged" required /><span>Learner acknowledgement has been recorded.</span></label>
              <button className="button primary" type="submit" disabled={!agreementAccepted}>Enable learner community access</button>
            </form>
            {accessRows.length > 0 && <div className="workspaceList">{accessRows.map((item) => <div className="workspaceRow" key={String(item.semantic_id)}><div><strong>{String(item.display_name || item.semantic_id)}</strong><div className="muted">{String(item.semantic_id)}</div></div><span className="pill">{String(item.age_band)} · {String(item.status)}</span></div>)}</div>}
          </article>
        </section>

        <section className="panel">
          <div className="eyebrow">Quarterly rhythm</div>
          <div className="communityStageGrid">{QUARTERLY_FORMAT.map((item) => <div className="miniCard light" key={item.stage}><strong>{item.stage} · weeks {item.weeks}</strong><span>{locale === "vi" ? item.vi : item.en}</span></div>)}</div>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Create a season</div>
            <h2 className="workspaceTitle">Quarterly competition</h2>
            <form action={createCommunitySeason} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label><span>English title</span><input name="titleEn" defaultValue={`Q${defaultQuarter} STEAM Builders`} maxLength={160} required /></label>
              <label><span>Vietnamese title</span><input name="titleVi" defaultValue={`Thử thách STEAM Quý ${defaultQuarter}`} maxLength={160} required /></label>
              <div className="inlineFields"><label><span>Year</span><input name="year" type="number" min="2025" max="2100" defaultValue={defaultYear} required /></label><label><span>Quarter</span><select name="quarter" defaultValue={String(defaultQuarter)}><option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option></select></label></div>
              <label><span>Theme EN</span><input name="themeEn" placeholder="Build something useful. Test it. Improve it. Explain it." maxLength={500} /></label>
              <label><span>Theme VI</span><input name="themeVi" placeholder="Xây điều hữu ích. Thử nghiệm. Cải tiến. Giải thích." maxLength={500} /></label>
              <div className="communityCheckGrid">{LEARNER_AGE_BANDS.map((key) => <label className="communityCheck" key={key}><input type="checkbox" name="ageBands" value={key} defaultChecked /><span>{LEARNER_AGE_PROFILES[key].ageLabelEn}</span></label>)}</div>
              <div className="inlineFields"><label><span>Starts</span><input name="startsOn" type="date" required /></label><label><span>Submission due</span><input name="submissionDueOn" type="date" required /></label></div>
              <label><span>Showcase date</span><input name="showcaseOn" type="date" /></label>
              <div className="inlineFields"><label><span>Leaderboard</span><select name="leaderboardMode" defaultValue="podium_only"><option value="hidden">Hidden</option><option value="podium_only">Podium only</option><option value="full">Full leaderboard</option></select></label><label><span>Season max team size</span><input name="maxTeamSize" type="number" min="1" max="30" defaultValue="8" /></label></div>
              <label className="communityCheck"><input type="checkbox" name="allowStudentTeamCreation" defaultChecked /><span>Students may create teams after school approval</span></label>
              <label className="communityCheck"><input type="checkbox" name="allowPeerKudos" defaultChecked /><span>Enable structured peer kudos during showcase</span></label>
              <label className="communityCheck"><input type="checkbox" name="advisorFeedbackRequired" defaultChecked /><span>Require advisor feedback before showcase</span></label>
              <label className="communityCheck"><input type="checkbox" name="publishAdvisorFeedback" /><span>Allow selected advisor feedback to appear in showcase</span></label>
              <button className="button primary" type="submit" disabled={!agreementAccepted}>Create quarterly season</button>
            </form>
          </article>

          <article className="panel">
            <div className="eyebrow">Season switcher</div>
            <h2 className="workspaceTitle">Manage a season</h2>
            {seasons.length === 0 ? <Empty text="Create the first quarterly season. Nothing is public until you open it." /> : <>
              <div className="workspaceList">{seasons.map((item) => <Link className="workspaceRow" key={String(item.id)} href={filterHref(String(item.id),age,mode,locale)}><div><strong>Q{String(item.quarter)} {String(item.year)} · {String(item.title_en)}</strong><div className="muted">{String(item.status)} · {String(item.visibility).replace("_"," ")}</div></div><span className="pill">{String(item.leaderboard_mode).replace("_"," ")}</span></Link>)}</div>
              {selectedSeason && <form action={updateCommunitySeasonStatus} className="workspaceForm"><input type="hidden" name="seasonId" value={seasonId} /><label><span>Season stage</span><select name="status" defaultValue={String(selectedSeason.status)}><option value="draft">Draft</option><option value="open">Open for builds</option><option value="review">Advisor review</option><option value="showcase">Showcase</option><option value="closed">Closed</option></select></label><button className="button soft" type="submit">Update stage</button></form>}
            </>}
          </article>
        </section>

        {selectedSeason && <>
          <section className="workspaceGrid">
            <article className="panel">
              <div className="eyebrow">Competition standards</div><h2 className="workspaceTitle">School-controlled settings</h2>
              <form action={updateCommunitySeasonControls} className="workspaceForm">
                <input type="hidden" name="seasonId" value={seasonId} />
                <div className="inlineFields"><label><span>Leaderboard</span><select name="leaderboardMode" defaultValue={String(selectedSeason.leaderboard_mode)}><option value="hidden">Hidden</option><option value="podium_only">Podium only</option><option value="full">Full leaderboard</option></select></label><label><span>Maximum team size</span><input name="maxTeamSize" type="number" min="1" max="30" defaultValue={Number(selectedSeason.max_team_size || 5)} /></label></div>
                <label><span>Showcase reach</span><select name="visibility" defaultValue={String(selectedSeason.visibility) === "network" ? "organization" : String(selectedSeason.visibility)}><option value="organization">Institution only</option><option value="network_pending">Request ViTech network showcase review</option></select></label>
                <label className="communityCheck"><input type="checkbox" name="allowStudentTeamCreation" defaultChecked={Boolean(selectedSeason.allow_student_team_creation)} /><span>Students may create teams after access is enabled</span></label>
                <label className="communityCheck"><input type="checkbox" name="allowPeerKudos" defaultChecked={Boolean(selectedSeason.allow_peer_kudos)} /><span>Structured peer kudos</span></label>
                <label className="communityCheck"><input type="checkbox" name="advisorFeedbackRequired" defaultChecked={Boolean(selectedSeason.advisor_feedback_required)} /><span>Advisor feedback required</span></label>
                <label className="communityCheck"><input type="checkbox" name="publishAdvisorFeedback" defaultChecked={Boolean(selectedSeason.publish_advisor_feedback)} /><span>Selected feedback may appear in showcase</span></label>
                <button className="button soft" type="submit">Save competition controls</button>
              </form>
            </article>

            <article className="panel">
              <div className="eyebrow">Advisor bench</div><h2 className="workspaceTitle">Mentors & judges</h2>
              {teachers.length === 0 ? <Empty text="Activate teacher accounts first." /> : <div className="muted">Available teachers: {teachers.map((item) => String(item.display_name || item.semantic_id)).join(" · ")}</div>}
              <form action={assignCommunityAdvisor} className="workspaceForm"><input type="hidden" name="seasonId" value={seasonId} /><label><span>Teacher semantic ID</span><input name="advisorSemanticId" maxLength={100} placeholder="vn-learner-…" required /></label><label><span>Role</span><select name="advisorRole" defaultValue="mentor_judge"><option value="mentor">Mentor</option><option value="judge">Judge</option><option value="mentor_judge">Mentor + judge</option></select></label><button className="button soft" type="submit">Assign advisor</button></form>
              {advisors.length > 0 && <div className="workspaceList">{advisors.map((item) => <div className="workspaceRow" key={String(item.semantic_id)}><div><strong>{String(item.display_name || item.semantic_id)}</strong><div className="muted">{String(item.semantic_id)}</div></div><span className="pill">{String(item.advisor_role).replace("_"," + ")}</span></div>)}</div>}
            </article>
          </section>

          <section className="panel">
            <div className="eyebrow">STEAM mission challenge library</div>
            <h2 className="workspaceTitle">Same mission architecture, different language and difficulty for each age level.</h2>
            <p className="muted"><strong>{activeAgeProfile.experienceNameEn}</strong> · {activeAgeProfile.languageEn}</p>
            <div className="communityFilters">
              <div className="actions">{LEARNER_AGE_BANDS.map((key) => <Link className={`button ${age === key ? "primary" : ""}`} href={filterHref(seasonId,key,mode,locale)} key={key}>{key}</Link>)}</div>
              <div className="actions">{MODES.map((item) => <Link className={`button ${mode === item ? "primary" : ""}`} href={filterHref(seasonId,age,item,locale)} key={item}>{challengeModeLabel(item, locale === "vi")}</Link>)}</div>
            </div>
            <div className="workspaceList" style={{ marginTop: 16 }}>{templates.map((item) => <form action={addCommunityChallenge} className="communityTemplateCard" key={item.templateKey}><input type="hidden" name="seasonId" value={seasonId} /><input type="hidden" name="templateKey" value={item.templateKey} /><div><div className="tagRow"><span className="tag">Integrated STEAM</span><span className="tag">Ages {item.ageBand}</span><span className="tag">{challengeModeLabel(item.participationMode)}</span><span className="tag">{item.minTeamSize}–{item.maxTeamSize} learner{item.maxTeamSize === 1 ? "" : "s"}</span></div><strong>{locale === "vi" ? item.titleVi : item.titleEn}</strong><p className="muted">{locale === "vi" ? item.briefVi : item.briefEn}</p><div className="tagRow">{item.skillsFocus.slice(0,7).map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div></div><button className="button primary" type="submit">Add to this quarter</button></form>)}</div>
          </section>

          <section className="workspaceGrid">
            <article className="panel"><div className="eyebrow">Live challenge set</div><h2 className="workspaceTitle">{challenges.length} configured challenge{challenges.length === 1 ? "" : "s"}</h2>{challenges.length === 0 ? <Empty text="Add a Community Bridge challenge from the proof-of-concept library above." /> : <div className="workspaceList">{challenges.map((item) => <div className="workspaceRow" key={String(item.id)}><div><strong>{String(item.title_en)}</strong><div className="muted">{String(item.studio_key).replaceAll("-"," ")} · ages {String(item.age_band)} · {String(item.participation_mode).replace("_"," ")} · {String(item.team_count)} team(s)</div></div><span className="pill">{String(item.status)}</span></div>)}</div>}</article>
            <article className="panel"><div className="eyebrow">Build teams & showcase</div><h2 className="workspaceTitle">{teams.length} participating team{teams.length === 1 ? "" : "s"}</h2>{teams.length === 0 ? <Empty text="Teams will appear after approved learners join an open challenge." /> : <div className="workspaceList">{teams.map((team) => <div className="feedbackCard" key={String(team.id)}><strong>{String(team.team_name)}</strong><div className="muted">{String(team.challenge_title)} · {String(team.member_count)} member(s) · {String(team.feedback_count)} feedback item(s)</div><div className="tagRow"><span className="tag">{String(team.status)}</span><span className="tag">{String(team.participation_mode).replace("_"," ")}</span>{team.latest_submission_id && <span className="tag">submission ready</span>}</div>{team.latest_submission_id && <div className="actions"><form action={approveCommunityShowcase}><input type="hidden" name="teamId" value={String(team.id)} /><input type="hidden" name="scope" value="organization" /><button className="button soft" type="submit">Approve institution showcase</button></form><form action={approveCommunityShowcase}><input type="hidden" name="teamId" value={String(team.id)} /><input type="hidden" name="scope" value="network_pending" /><button className="button" type="submit">Request network showcase review</button></form></div>}<form action={publishCommunityResult} className="inlineFields"><input type="hidden" name="seasonId" value={seasonId} /><input type="hidden" name="teamId" value={String(team.id)} /><input name="awardLabel" placeholder="Best Iteration / Community Design / Champion…" maxLength={120} required /><input name="placement" type="number" min="1" max="1000" placeholder="Place" /><button className="button soft" type="submit">Publish recognition</button></form></div>)}</div>}</article>
          </section>
        </>}
      </div>
    </main>
  );
}

function filterHref(season: string, age: LearnerAgeBand, mode: ParticipationMode, locale: "vi" | "en") {
  const query = new URLSearchParams({ season, age, mode, lang: locale });
  return `/workspace/partner/community?${query.toString()}`;
}

function CommunityHeader({ locale }: { locale: "vi" | "en" }) {
  return <header className="topbar"><Link className="brand" href="/workspace/partner"><VitechMark /><span>Career Compass Junior</span></Link><div><strong>{locale === "vi" ? "Cộng đồng & Thử thách Quý" : "Community & Quarterly Challenges"}</strong><div className="muted" style={{ fontSize: 12 }}>School-controlled · age-levelled · moderated</div></div><div className="actions"><Link className="pill" href="/workspace/partner/community?lang=en">EN</Link><Link className="pill" href="/workspace/partner/community?lang=vi">VI</Link><Link className="pill" href="/workspace/partner">Partner Workspace</Link></div></header>;
}

function Empty({ text }: { text: string }) {
  return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>;
}

function Gate({ copy }: { copy: string }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Community Studio</strong><Link className="pill" href="/workspace/partner">Partner Workspace</Link></header><div className="workspaceContent"><section className="panel gatePanel"><h2>School administrator controls required</h2><p className="muted">{copy}</p></section></div></main>;
}
