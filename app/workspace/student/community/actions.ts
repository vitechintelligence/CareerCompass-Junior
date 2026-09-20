"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { COMMUNITY_KUDOS } from "@/lib/community-challenges";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: FormDataEntryValue | null, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

function assertUuid(value: string, label: string) {
  if (!UUID_RE.test(value)) throw new Error(`Invalid ${label}.`);
}

function safeUrl(value: string) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!["https:","http:"].includes(parsed.protocol)) throw new Error("bad protocol");
    return parsed.toString().slice(0, 1000);
  } catch {
    throw new Error("Links must be valid http(s) URLs.");
  }
}

async function requireStudent() {
  const profile = await getCurrentProfile();
  if (!profile || profile.account_type !== "student" || profile.status !== "active") {
    throw new Error("Active student access required.");
  }
  return profile;
}

async function requireStudentInOrganization(studentId: string, organizationId: string) {
  const sql = getDb();
  const rows = await sql`
    select csa.age_band
    from community_student_access csa
    where csa.organization_id=${organizationId}
      and csa.student_id=${studentId}
      and csa.status='enabled'
      and csa.guardian_consent_confirmed=true
      and csa.learner_acknowledged=true
      and exists (
        select 1
        from class_memberships cm
        join classes c on c.id=cm.class_id
        where cm.student_id=${studentId}
          and cm.status='active'
          and c.status='active'
          and c.organization_id=${organizationId}
      )
    limit 1
  `;
  if (!rows[0]) throw new Error("Your school or teacher has not enabled community access for this account.");
  return String(rows[0].age_band);
}

async function getOpenChallenge(challengeId: string, studentId: string) {
  assertUuid(challengeId, "challenge");
  const sql = getDb();
  const rows = await sql`
    select cc.*, cs.organization_id, cs.status as season_status,
      cs.allow_student_team_creation, cs.max_team_size as season_max_team_size,
      cs.submission_due_on
    from community_challenges cc
    join community_seasons cs on cs.id=cc.season_id
    where cc.id=${challengeId}
      and cc.status='open'
      and cs.status='open'
    limit 1
  `;
  if (!rows[0]) throw new Error("This challenge is not currently open.");
  const learnerAgeBand = await requireStudentInOrganization(studentId, String(rows[0].organization_id));
  if (String(rows[0].age_band) !== learnerAgeBand) {
    throw new Error("This challenge is for a different learner age level.");
  }
  return rows[0];
}

export async function createCommunityTeam(formData: FormData) {
  const profile = await requireStudent();
  const challengeId = text(formData.get("challengeId"), 60);
  const challenge = await getOpenChallenge(challengeId, profile.id);
  if (!challenge.allow_student_team_creation) throw new Error("Your institution creates teams for this season.");

  const sql = getDb();
  const existing = await sql`
    select 1
    from community_team_members ctm
    join community_teams ct on ct.id=ctm.team_id
    where ctm.student_id=${profile.id}
      and ctm.status='active'
      and ct.challenge_id=${challengeId}
      and ct.status <> 'archived'
    limit 1
  `;
  if (existing[0]) throw new Error("You already belong to a team for this challenge.");

  const participationMode = String(challenge.participation_mode);
  const requestedName = text(formData.get("teamName"), 80);
  const teamName = participationMode === "individual"
    ? (requestedName || `${profile.display_name || profile.semantic_id} · Solo`)
    : requestedName;
  if (teamName.length < 2) throw new Error("Team name is required.");

  const semanticId = `team-${randomUUID().slice(0,10)}`;
  const joinCode = randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
  const created = await sql`
    insert into community_teams (
      challenge_id, organization_id, semantic_id, join_code, team_name, created_by, status
    )
    values (
      ${challengeId}, ${String(challenge.organization_id)}, ${semanticId}, ${joinCode},
      ${teamName}, ${profile.id}, 'active'
    )
    returning id
  `;
  const teamId = String(created[0]?.id || "");
  if (!teamId) throw new Error("Could not create team.");

  await sql`
    insert into community_team_members (team_id, student_id, member_role, status)
    values (${teamId}, ${profile.id}, 'creator', 'active')
  `;

  revalidatePath("/workspace/student/community");
  revalidatePath("/workspace/partner/community");
}

export async function joinCommunityTeam(formData: FormData) {
  const profile = await requireStudent();
  const joinCode = text(formData.get("joinCode"), 16).toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(joinCode)) throw new Error("Enter a valid team join code.");

  const sql = getDb();
  const rows = await sql`
    select ct.id, ct.challenge_id, ct.organization_id,
      cc.participation_mode, cc.max_team_size,
      cs.max_team_size as season_max_team_size, cs.status as season_status,
      cs.allow_student_team_creation
    from community_teams ct
    join community_challenges cc on cc.id=ct.challenge_id
    join community_seasons cs on cs.id=cc.season_id
    where ct.join_code=${joinCode}
      and ct.status='active'
      and cc.status='open'
      and cs.status='open'
    limit 1
  `;
  const team = rows[0];
  if (!team) throw new Error("Open team not found for that code.");
  if (String(team.participation_mode) === "individual") throw new Error("Individual challenges do not accept teammates.");
  const learnerAgeBand = await requireStudentInOrganization(profile.id, String(team.organization_id));
  const challengeRows = await sql`select age_band from community_challenges where id=${String(team.challenge_id)} limit 1`;
  if (String(challengeRows[0]?.age_band || "") !== learnerAgeBand) {
    throw new Error("This team belongs to a different learner age level.");
  }

  const already = await sql`
    select 1
    from community_team_members ctm
    join community_teams ct on ct.id=ctm.team_id
    where ctm.student_id=${profile.id}
      and ctm.status='active'
      and ct.challenge_id=${String(team.challenge_id)}
      and ct.status <> 'archived'
    limit 1
  `;
  if (already[0]) throw new Error("You already belong to a team for this challenge.");

  const countRows = await sql`select count(*)::int as count from community_team_members where team_id=${String(team.id)} and status='active'`;
  const limit = Math.min(Number(team.max_team_size || 5), Number(team.season_max_team_size || 5));
  if (Number(countRows[0]?.count || 0) >= limit) throw new Error("This team is full.");

  await sql`
    insert into community_team_members (team_id, student_id, member_role, status)
    values (${String(team.id)}, ${profile.id}, 'member', 'active')
  `;

  revalidatePath("/workspace/student/community");
  revalidatePath("/workspace/partner/community");
}

export async function submitCommunityProject(formData: FormData) {
  const profile = await requireStudent();
  const teamId = text(formData.get("teamId"), 60);
  assertUuid(teamId, "team");
  const title = text(formData.get("title"), 180);
  const summary = text(formData.get("summary"), 4000);
  const reflection = text(formData.get("reflection"), 4000);
  if (!title || summary.length < 20) throw new Error("Add a project title and a useful summary.");

  const sql = getDb();
  const rows = await sql`
    select ct.id, ct.challenge_id, cs.status as season_status, cs.submission_due_on
    from community_team_members ctm
    join community_teams ct on ct.id=ctm.team_id
    join community_challenges cc on cc.id=ct.challenge_id
    join community_seasons cs on cs.id=cc.season_id
    where ctm.team_id=${teamId}
      and ctm.student_id=${profile.id}
      and ctm.status='active'
      and ct.status <> 'archived'
    limit 1
  `;
  if (!rows[0]) throw new Error("You are not an active member of this team.");
  if (!["open","review"].includes(String(rows[0].season_status))) throw new Error("This season is not accepting submissions.");

  const versionRows = await sql`select coalesce(max(version_number),0)::int + 1 as next from community_submissions where team_id=${teamId}`;
  const version = Number(versionRows[0]?.next || 1);
  const artifactUrl = safeUrl(text(formData.get("artifactUrl"), 1000));
  const repositoryUrl = safeUrl(text(formData.get("repositoryUrl"), 1000));
  const demoUrl = safeUrl(text(formData.get("demoUrl"), 1000));

  await sql`
    insert into community_submissions (
      team_id, version_number, title, summary, artifact_url, repository_url, demo_url,
      reflection, evidence, status, submitted_by, submitted_at
    )
    values (
      ${teamId}, ${version}, ${title}, ${summary}, ${artifactUrl}, ${repositoryUrl}, ${demoUrl},
      ${reflection || null}, ${JSON.stringify({ version, submittedBy: profile.semantic_id })}::jsonb,
      'submitted', ${profile.id}, now()
    )
  `;
  await sql`
    update community_teams
    set project_title=${title}, project_summary=${summary}, repository_url=${repositoryUrl},
        demo_url=${demoUrl}, status='submitted', updated_at=now()
    where id=${teamId}
  `;

  revalidatePath("/workspace/student/community");
  revalidatePath("/workspace/partner/community");
  revalidatePath("/workspace/teacher/community");
}

export async function giveCommunityKudos(formData: FormData) {
  const profile = await requireStudent();
  const teamId = text(formData.get("teamId"), 60);
  assertUuid(teamId, "team");
  const kind = text(formData.get("kind"), 40);
  if (!COMMUNITY_KUDOS.some((item) => item.key === kind)) throw new Error("Invalid kudos type.");

  const sql = getDb();
  const rows = await sql`
    select ct.id, ct.organization_id, cs.id as season_id, cs.allow_peer_kudos, cs.status
    from community_teams ct
    join community_challenges cc on cc.id=ct.challenge_id
    join community_seasons cs on cs.id=cc.season_id
    where ct.id=${teamId}
      and ct.partner_approved_showcase=true
      and ct.showcase_visibility in ('organization','network')
    limit 1
  `;
  const item = rows[0];
  if (!item || !item.allow_peer_kudos || String(item.status) !== "showcase") {
    throw new Error("Peer kudos are not enabled for this showcase.");
  }
  await requireStudentInOrganization(profile.id, String(item.organization_id));

  const own = await sql`
    select 1 from community_team_members
    where team_id=${teamId} and student_id=${profile.id} and status='active'
    limit 1
  `;
  if (own[0]) throw new Error("Give kudos to another team.");

  await sql`
    insert into community_kudos (season_id, team_id, given_by, kind)
    values (${String(item.season_id)}, ${teamId}, ${profile.id}, ${kind})
    on conflict (season_id, team_id, given_by, kind) do nothing
  `;

  revalidatePath("/workspace/student/community");
}
