import { ensureStudentProfile, getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { configuredAdminEmails, verifiedPlatformAdminEmailRequired } from "@/lib/auth/admin-identity-policy";
export { DEFAULT_PLATFORM_ADMIN_EMAIL } from "@/lib/auth/admin-identity-policy";
export { verifiedPlatformAdminEmailRequired } from "@/lib/auth/admin-identity-policy";

function userEmail(user: unknown) {
  const raw = (user as { email?: unknown } | null)?.email;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function userEmailVerified(user: unknown) {
  return (user as { emailVerified?: unknown } | null)?.emailVerified === true;
}

export async function getPlatformAdminContext() {
  const user = await getSessionUser();
  if (!user?.id) return null;

  let profile = await getCurrentProfile();
  if (!profile) profile = await ensureStudentProfile("en");
  if (!profile || profile.status !== "active") return null;

  if (profile.account_type === "platform_admin") {
    if (verifiedPlatformAdminEmailRequired() && !userEmailVerified(user)) return null;
    return { user, profile, email: userEmail(user) };
  }

  const email = userEmail(user);
  if (!email || !configuredAdminEmails().has(email)) return null;
  // New promotions always require ownership proof. Existing admins above keep
  // the temporary recovery path until the two-admin gate permits tightening it.
  if (!userEmailVerified(user)) return null;

  const sql = getDb();
  const rows = await sql`
    with candidate as (
      select id, account_type as previous_role
      from profiles
      where id = ${profile.id}
        and auth_subject = ${String(user.id)}
        and status = 'active'
      for update
    ), promoted as (
      update profiles p
      set account_type = 'platform_admin', updated_at = now()
      from candidate c
      where p.id = c.id and c.previous_role <> 'platform_admin'
      returning p.id, p.semantic_id, p.auth_subject, p.display_name,
        p.account_type, p.preferred_locale, p.status, c.previous_role
    ), audited as (
      insert into admin_audit_events(actor_profile_id,event_type,target_type,target_id,detail)
      select id, 'platform_admin_granted', 'profile', id::text,
        jsonb_build_object('previous_role',previous_role,'new_role','platform_admin',
          'grant_source','verified_email_allowlist','email_verified',true)
      from promoted
      returning target_id
    )
    select p.id, p.semantic_id, p.auth_subject, p.display_name,
      p.account_type, p.preferred_locale, p.status
    from promoted p join audited a on a.target_id=p.id::text
  `;

  // A concurrent request may have completed the same grant while candidate
  // waited for the row lock. Never emit another audit event for that retry.
  const promoted = rows[0] ?? await getCurrentProfile();
  if (!promoted || promoted.account_type !== 'platform_admin' || promoted.status !== 'active') return null;

  return {
    user,
    profile: promoted as typeof profile,
    email,
  };
}

export async function requirePlatformAdmin() {
  const context = await getPlatformAdminContext();
  if (!context) throw new Error("Platform administrator access required.");
  return context;
}

export function platformAdminEmailsForDisplay() {
  return Array.from(configuredAdminEmails());
}
