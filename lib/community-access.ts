import "server-only";

import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { COMMUNITY_PRIVACY_VERSION, COMMUNITY_TERMS_VERSION } from "@/lib/community-terms";

export type CommunityCapability =
  | "initiate"
  | "enable_students"
  | "moderate"
  | "assign_advisors";

export async function requireInstitutionAdult(organizationId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !["teacher","partner_admin","platform_admin"].includes(profile.account_type)) {
    throw new Error("Teacher or administrator access required.");
  }

  if (profile.account_type === "platform_admin") return profile;

  const sql = getDb();
  const role = profile.account_type === "teacher" ? "teacher" : "partner_admin";
  const membership = await sql`
    select 1
    from organization_memberships
    where organization_id=${organizationId}
      and profile_id=${profile.id}
      and role=${role}
      and status='active'
    limit 1
  `;
  if (!membership[0]) throw new Error("You are not an active member of this institution.");
  return profile;
}

export async function hasCurrentCommunityAgreement(organizationId: string, profileId: string) {
  const sql = getDb();
  const rows = await sql`
    select 1
    from community_agreement_acceptances
    where organization_id=${organizationId}
      and profile_id=${profileId}
      and accepted=true
      and revoked_at is null
      and terms_version=${COMMUNITY_TERMS_VERSION}
      and privacy_version=${COMMUNITY_PRIVACY_VERSION}
    limit 1
  `;
  return Boolean(rows[0]);
}

export async function requireCommunityManager(organizationId: string, capability: CommunityCapability) {
  const profile = await requireInstitutionAdult(organizationId);

  if (!(await hasCurrentCommunityAgreement(organizationId, profile.id))) {
    throw new Error("Accept the current Community Terms & Privacy Notice before managing this community.");
  }

  if (["platform_admin","partner_admin"].includes(profile.account_type)) return profile;

  const sql = getDb();
  const rows = await sql`
    select can_initiate_seasons, can_enable_students, can_moderate, can_assign_advisors
    from community_staff_permissions
    where organization_id=${organizationId}
      and teacher_id=${profile.id}
    limit 1
  `;
  const permission = rows[0];
  const allowed = capability === "initiate" ? permission?.can_initiate_seasons
    : capability === "enable_students" ? permission?.can_enable_students
      : capability === "moderate" ? permission?.can_moderate
        : permission?.can_assign_advisors;

  if (!allowed) throw new Error("Your school administrator has not delegated this community permission.");
  return profile;
}
