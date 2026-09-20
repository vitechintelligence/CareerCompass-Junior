"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { isLearnerAgeBand } from "@/lib/learner-age-bands";
import { getChallengeTemplate, rubricForMode } from "@/lib/community-challenges";
import { requireCommunityManager } from "@/lib/community-access";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEMANTIC_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/;

function text(value: FormDataEntryValue | null, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function bool(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function dateValue(value: FormDataEntryValue | null) {
  const result = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error("A valid date is required.");
  return result;
}

function assertUuid(value: string, label: string) {
  if (!UUID_RE.test(value)) throw new Error(`Invalid ${label}.`);
}

async function loadSeason(seasonId: string) {
  assertUuid(seasonId, "season");
  const sql = getDb();
  const rows = await sql`
    select id, organization_id, status, max_team_size
    from community_seasons
    where id=${seasonId}
    limit 1
  `;
  if (!rows[0]) throw new Error("Community season not found.");
  return rows[0];
}

async function requireSeasonCapability(
  seasonId: string,
  capability: "initiate" | "enable_students" | "moderate" | "assign_advisors",
) {
  const season = await loadSeason(seasonId);
  await requireCommunityManager(String(season.organization_id), capability);
  return season;
}

export async function createCommunitySeason(formData: FormData) {
  const organizationId = text(formData.get("organizationId"), 60);
  const profile = await requireCommunityManager(organizationId, "initiate");
  const titleEn = text(formData.get("titleEn"), 160);
  const titleVi = text(formData.get("titleVi"), 160);
  const themeEn = text(formData.get("themeEn"), 500);
  const themeVi = text(formData.get("themeVi"), 500);
  const year = Number(text(formData.get("year"), 4));
  const quarter = Number(text(formData.get("quarter"), 1));
  const startsOn = dateValue(formData.get("startsOn"));
  const submissionDueOn = dateValue(formData.get("submissionDueOn"));
  const showcaseOnRaw = text(formData.get("showcaseOn"), 10);
  const showcaseOn = showcaseOnRaw ? dateValue(formData.get("showcaseOn")) : null;
  const ageBands = formData.getAll("ageBands").map(String).filter(isLearnerAgeBand);
  const maxTeamSize = Math.max(1, Math.min(30, Number(text(formData.get("maxTeamSize"), 2)) || 5));
  const leaderboardMode = text(formData.get("leaderboardMode"), 20) || "podium_only";

  if (!["hidden","podium_only","full"].includes(leaderboardMode)) throw new Error("Invalid leaderboard mode.");
  if (!titleEn || !titleVi) throw new Error("Season title is required in English and Vietnamese.");
  if (!Number.isInteger(year) || year < 2025 || year > 2100) throw new Error("Invalid season year.");
  if (![1,2,3,4].includes(quarter)) throw new Error("Quarter must be 1–4.");
  if (ageBands.length === 0) throw new Error("Select at least one learner age level.");
  if (submissionDueOn < startsOn) throw new Error("Submission due date cannot be before the start date.");
  if (showcaseOn && showcaseOn < submissionDueOn) throw new Error("Showcase date cannot be before submissions close.");

  const sql = getDb();
  const semanticId = `season-${year}-q${quarter}-${randomUUID().slice(0,8)}`;
  await sql`
    insert into community_seasons (
      organization_id, semantic_id, title_en, title_vi, year, quarter,
      theme_en, theme_vi, age_bands, starts_on, submission_due_on,
      showcase_on, leaderboard_mode, allow_student_team_creation, allow_peer_kudos,
      max_team_size, advisor_feedback_required, publish_advisor_feedback, initiated_by
    )
    values (
      ${organizationId}, ${semanticId}, ${titleEn}, ${titleVi}, ${year}, ${quarter},
      ${themeEn || null}, ${themeVi || null}, ${ageBands}, ${startsOn},
      ${submissionDueOn}, ${showcaseOn}, ${leaderboardMode},
      ${bool(formData.get("allowStudentTeamCreation"))}, ${bool(formData.get("allowPeerKudos"))},
      ${maxTeamSize}, ${bool(formData.get("advisorFeedbackRequired"))},
      ${bool(formData.get("publishAdvisorFeedback"))}, ${profile.id}
    )
  `;

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
  revalidatePath("/workspace/student/community");
}

export async function updateCommunitySeasonStatus(formData: FormData) {
  const seasonId = text(formData.get("seasonId"), 60);
  await requireSeasonCapability(seasonId, "moderate");
  const status = text(formData.get("status"), 20);
  if (!["draft","open","review","showcase","closed"].includes(status)) throw new Error("Invalid season status.");

  const sql = getDb();
  await sql`update community_seasons set status=${status}, updated_at=now() where id=${seasonId}`;
  if (status === "open") {
    await sql`update community_challenges set status='open', updated_at=now() where season_id=${seasonId} and status <> 'closed'`;
  } else if (status === "closed") {
    await sql`update community_challenges set status='closed', updated_at=now() where season_id=${seasonId}`;
  }

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
  revalidatePath("/workspace/student/community");
}

export async function updateCommunitySeasonControls(formData: FormData) {
  const seasonId = text(formData.get("seasonId"), 60);
  await requireSeasonCapability(seasonId, "moderate");
  const leaderboardMode = text(formData.get("leaderboardMode"), 20);
  if (!["hidden","podium_only","full"].includes(leaderboardMode)) throw new Error("Invalid leaderboard mode.");
  const visibility = text(formData.get("visibility"), 30);
  if (!["organization","network_pending"].includes(visibility)) {
    throw new Error("Institution managers may keep a showcase inside the institution or request ViTech network review.");
  }
  const maxTeamSize = Math.max(1, Math.min(30, Number(text(formData.get("maxTeamSize"), 2)) || 5));

  const sql = getDb();
  await sql`
    update community_seasons
    set leaderboard_mode=${leaderboardMode},
        visibility=${visibility},
        allow_student_team_creation=${bool(formData.get("allowStudentTeamCreation"))},
        allow_peer_kudos=${bool(formData.get("allowPeerKudos"))},
        max_team_size=${maxTeamSize},
        advisor_feedback_required=${bool(formData.get("advisorFeedbackRequired"))},
        publish_advisor_feedback=${bool(formData.get("publishAdvisorFeedback"))},
        updated_at=now()
    where id=${seasonId}
  `;

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
  revalidatePath("/workspace/student/community");
}

export async function addCommunityChallenge(formData: FormData) {
  const seasonId = text(formData.get("seasonId"), 60);
  const season = await requireSeasonCapability(seasonId, "moderate");
  const templateKey = text(formData.get("templateKey"), 220);
  const template = getChallengeTemplate(templateKey);
  if (!template) throw new Error("Challenge template not found.");

  const seasonAges = await getDb()`select age_bands from community_seasons where id=${seasonId} limit 1`;
  const allowedAges = Array.isArray(seasonAges[0]?.age_bands) ? seasonAges[0].age_bands.map(String) : [];
  if (!allowedAges.includes(template.ageBand)) {
    throw new Error("This age level is not enabled for the selected season.");
  }

  const actor = await getCurrentProfile();
  if (!actor) throw new Error("Sign in required.");
  const sql = getDb();
  const semanticId = `challenge-${randomUUID().slice(0,10)}`;
  const deliverables = {
    en: template.deliverablesEn,
    vi: template.deliverablesVi,
    rolesEn: template.rolesEn,
    rolesVi: template.rolesVi,
    advisorPromptsEn: template.advisorPromptsEn,
    advisorPromptsVi: template.advisorPromptsVi,
  };
  const rubric = rubricForMode(template.participationMode);
  const bonusRules = { en: template.bonusRuleEn, vi: template.bonusRuleVi };

  await sql`
    insert into community_challenges (
      season_id, semantic_id, mission_key, studio_key, age_band, participation_mode,
      min_team_size, max_team_size, title_en, title_vi, brief_en, brief_vi,
      deliverables, rubric, skills_focus, bonus_rules, status, created_by
    )
    values (
      ${seasonId}, ${semanticId}, ${template.missionKey}, ${template.studioKey}, ${template.ageBand},
      ${template.participationMode}, ${template.minTeamSize},
      ${Math.min(template.maxTeamSize, Number(season.max_team_size || template.maxTeamSize))},
      ${template.titleEn}, ${template.titleVi}, ${template.briefEn}, ${template.briefVi},
      ${JSON.stringify(deliverables)}::jsonb, ${JSON.stringify(rubric)}::jsonb,
      ${template.skillsFocus}, ${JSON.stringify(bonusRules)}::jsonb,
      ${String(season.status) === "open" ? "open" : "draft"}, ${actor.id}
    )
  `;

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
  revalidatePath("/workspace/student/community");
}

export async function assignCommunityAdvisor(formData: FormData) {
  const seasonId = text(formData.get("seasonId"), 60);
  const season = await requireSeasonCapability(seasonId, "assign_advisors");
  const advisorSemanticId = text(formData.get("advisorSemanticId"), 100);
  const advisorRole = text(formData.get("advisorRole"), 20) || "mentor";
  if (!SEMANTIC_RE.test(advisorSemanticId)) throw new Error("Invalid advisor semantic ID.");
  if (!["mentor","judge","mentor_judge"].includes(advisorRole)) throw new Error("Invalid advisor role.");

  const sql = getDb();
  const rows = await sql`
    select p.id
    from profiles p
    join organization_memberships om on om.profile_id=p.id
    where p.semantic_id=${advisorSemanticId}
      and p.account_type='teacher'
      and p.status='active'
      and om.organization_id=${String(season.organization_id)}
      and om.role='teacher'
      and om.status='active'
    limit 1
  `;
  if (!rows[0]) throw new Error("Active teacher advisor not found in this institution.");
  const actor = await getCurrentProfile();

  await sql`
    insert into community_advisors (season_id, advisor_profile_id, advisor_role, status, assigned_by)
    values (${seasonId}, ${String(rows[0].id)}, ${advisorRole}, 'active', ${actor?.id || null})
    on conflict (season_id, advisor_profile_id) do update set
      advisor_role=excluded.advisor_role, status='active', assigned_by=excluded.assigned_by, assigned_at=now()
  `;

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
}

export async function approveCommunityShowcase(formData: FormData) {
  const teamId = text(formData.get("teamId"), 60);
  assertUuid(teamId, "team");
  const sql = getDb();
  const rows = await sql`
    select ct.organization_id
    from community_teams ct
    where ct.id=${teamId}
    limit 1
  `;
  if (!rows[0]) throw new Error("Team not found.");
  await requireCommunityManager(String(rows[0].organization_id), "moderate");

  const scope = text(formData.get("scope"), 30);
  if (!["organization","network_pending"].includes(scope)) throw new Error("Invalid showcase scope.");

  await sql`
    update community_teams
    set partner_approved_showcase=true, showcase_visibility=${scope}, updated_at=now()
    where id=${teamId}
  `;
  const latest = await sql`
    select id from community_submissions
    where team_id=${teamId} and status in ('submitted','reviewed','showcase')
    order by version_number desc
    limit 1
  `;
  if (latest[0]) {
    await sql`update community_submissions set status='showcase', updated_at=now() where id=${String(latest[0].id)}`;
  }

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
  revalidatePath("/workspace/student/community");
}

export async function publishCommunityResult(formData: FormData) {
  const seasonId = text(formData.get("seasonId"), 60);
  await requireSeasonCapability(seasonId, "moderate");
  const teamId = text(formData.get("teamId"), 60);
  assertUuid(teamId, "team");
  const awardLabel = text(formData.get("awardLabel"), 120);
  const placementRaw = text(formData.get("placement"), 4);
  const placement = placementRaw ? Number(placementRaw) : null;
  if (!awardLabel) throw new Error("Award label is required.");
  if (placement !== null && (!Number.isInteger(placement) || placement < 1 || placement > 1000)) {
    throw new Error("Placement must be a positive whole number.");
  }

  const sql = getDb();
  const valid = await sql`
    select 1
    from community_teams ct
    join community_challenges cc on cc.id=ct.challenge_id
    where ct.id=${teamId} and cc.season_id=${seasonId}
    limit 1
  `;
  if (!valid[0]) throw new Error("Team does not belong to this season.");
  const actor = await getCurrentProfile();

  await sql`
    insert into community_results (season_id, team_id, award_label, placement, published, published_by, published_at)
    values (${seasonId}, ${teamId}, ${awardLabel}, ${placement}, true, ${actor?.id || null}, now())
    on conflict (season_id, team_id) do update set
      award_label=excluded.award_label,
      placement=excluded.placement,
      published=true,
      published_by=excluded.published_by,
      published_at=now(),
      updated_at=now()
  `;

  await sql`
    update community_teams
    set status=${placement === 1 ? "winner" : "finalist"}, updated_at=now()
    where id=${teamId}
  `;

  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
  revalidatePath("/workspace/student/community");
}
