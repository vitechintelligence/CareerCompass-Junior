import { ensureStudentProfile, getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { configuredAdminEmails } from "@/lib/auth/admin-identity-policy";
export { DEFAULT_PLATFORM_ADMIN_EMAIL } from "@/lib/auth/admin-identity-policy";

function userEmail(user: unknown) {
  const raw = (user as { email?: unknown } | null)?.email;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function userEmailVerified(user: unknown) {
  return (user as { emailVerified?: unknown } | null)?.emailVerified === true;
}

export function verifiedPlatformAdminEmailRequired() {
  return String(process.env.CCJ_REQUIRE_VERIFIED_PLATFORM_ADMIN || "")
    .trim()
    .toLowerCase() === "true";
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
    update profiles
    set account_type = 'platform_admin', updated_at = now()
    where id = ${profile.id}
      and status = 'active'
    returning id, semantic_id, auth_subject, display_name, account_type, preferred_locale, status
  `;

  const promoted = rows[0];
  if (!promoted) return null;

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
