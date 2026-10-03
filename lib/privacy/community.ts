import "server-only";
import { getDb } from "@/lib/db";
import { isUuidReference } from "@/lib/auth/authorization-policy";
import { optionalProcessingAllowed } from "@/lib/privacy/access";

// Include past members and submission authors: leaving a team must not make
// a contributor's consent irrelevant to material they already supplied.
export async function communityTeamSharingAllowed(organizationId: string, teamId: string) {
  if (![organizationId,teamId].every(isUuidReference)) return false;
  const contributors=await getDb()`select distinct contributors.student_id from community_teams t
    join community_challenges challenge on challenge.id=t.challenge_id
    join community_seasons season on season.id=challenge.season_id and season.organization_id=t.organization_id
    join lateral (
      select student_id from community_team_members where team_id=t.id
      union select submitted_by as student_id from community_submissions where team_id=t.id
    ) contributors on true
    where t.id=${teamId} and t.organization_id=${organizationId} and t.status<>'archived'`;
  if (!contributors.length || contributors.some(c=>!isUuidReference(c.student_id))) return false;
  const decisions=await Promise.all(contributors.map(c=>optionalProcessingAllowed(organizationId,String(c.student_id),'community_showcase')));
  return decisions.every(Boolean);
}
export async function requireCommunityTeamSharing(organizationId: string, teamId: string) {
  if (!await communityTeamSharingAllowed(organizationId,teamId)) throw Error('all_contributors_current_consent_required');
}
