import { getDb } from "@/lib/db";
import { getAuth } from "@/lib/auth/server";

export type LmsProfile = {
  id: string;
  semantic_id: string;
  auth_subject: string | null;
  account_type: "student" | "teacher" | "partner_admin" | "platform_admin";
  preferred_locale: "en" | "vi";
  status: string;
};

export async function getSessionUser() {
  const auth = getAuth();
  if (!auth) return null;

  const { data } = await auth.getSession();
  return data?.user ?? null;
}

export async function ensureStudentProfile(locale: "en" | "vi" = "vi") {
  const user = await getSessionUser();
  if (!user?.id) return null;

  const sql = getDb();
  const authSubject = String(user.id);
  const semanticId = `vn-learner-${authSubject.replaceAll("-", "").slice(0, 16)}`;

  const rows = await sql`
    insert into profiles (
      semantic_id,
      auth_subject,
      preferred_locale,
      account_type,
      status
    )
    values (
      ${semanticId},
      ${authSubject},
      ${locale},
      'student',
      'active'
    )
    on conflict (auth_subject) do update set
      preferred_locale = excluded.preferred_locale,
      updated_at = now()
    returning id, semantic_id, auth_subject, account_type, preferred_locale, status
  `;

  return (rows[0] ?? null) as LmsProfile | null;
}

export async function getCurrentProfile() {
  const user = await getSessionUser();
  if (!user?.id) return null;

  const sql = getDb();
  const rows = await sql`
    select id, semantic_id, auth_subject, account_type, preferred_locale, status
    from profiles
    where auth_subject = ${String(user.id)}
    limit 1
  `;

  return (rows[0] ?? null) as LmsProfile | null;
}
