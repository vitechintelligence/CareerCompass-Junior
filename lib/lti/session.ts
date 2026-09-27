import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { LTI_FRAME_HOST_COOKIE, LTI_SESSION_COOKIE } from "@/lib/lti/constants";
import { stableHash } from "@/lib/lti/policy";
import type { LtiPlatformRegistration } from "@/lib/lti/runtime";

export const ltiSessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
  partitioned: true,
};

export const ltiFrameCookieOptions = {
  ...ltiSessionCookieOptions,
  maxAge: 60 * 60 * 8,
};

export { LTI_FRAME_HOST_COOKIE };

export async function createLtiLaunchSession(input: {
  registration: LtiPlatformRegistration;
  profileId: string;
  classId: string | null;
  messageType: "LtiResourceLinkRequest" | "LtiDeepLinkingRequest";
  externalContextId: string | null;
  externalResourceLinkId: string | null;
  launchNonce: string;
  serviceClaims: Record<string, unknown>;
  deepLinkSettings: Record<string, unknown>;
  targetPath: string;
}) {
  const token = randomBytes(32).toString("base64url");
  const sql = getDb();
  const rows = await sql`
    insert into lti_launch_sessions (
      registration_id, organization_id, profile_id, class_id, message_type,
      external_context_id, external_resource_link_id, launch_nonce, session_token_hash,
      service_claims, deep_link_settings, target_path, expires_at
    ) values (
      ${input.registration.id}, ${input.registration.organizationId}, ${input.profileId},
      ${input.classId}, ${input.messageType}, ${input.externalContextId},
      ${input.externalResourceLinkId}, ${input.launchNonce}, ${stableHash(token)},
      ${JSON.stringify(input.serviceClaims)}::jsonb,
      ${JSON.stringify(input.deepLinkSettings)}::jsonb,
      ${input.targetPath}, now() + interval '8 hours'
    )
    returning id, expires_at
  `;
  return { token, id: String(rows[0].id), expiresAt: rows[0].expires_at };
}

export async function getCurrentLtiSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(LTI_SESSION_COOKIE)?.value;
  if (!token) return null;

  const sql = getDb();
  const rows = await sql`
    select
      s.id, s.registration_id, s.organization_id, s.profile_id, s.class_id,
      s.message_type, s.external_context_id, s.external_resource_link_id, s.launch_nonce,
      s.service_claims, s.deep_link_settings, s.target_path, s.expires_at,
      r.installation_id, r.platform_name, r.issuer, r.client_id, r.deployment_id,
      r.auth_login_url, r.auth_token_url, r.jwks_url,
      p.auth_subject, p.display_name, p.account_type, p.status as profile_status,
      o.status as organization_status
    from lti_launch_sessions s
    join lti_registrations r on r.id=s.registration_id and r.status='active'
    join integration_installations i on i.id=r.installation_id
      and i.organization_id=s.organization_id
      and i.status in ('configured','active')
    join profiles p on p.id=s.profile_id
    join organizations o on o.id=s.organization_id
    where s.session_token_hash=${stableHash(token)}
      and s.revoked_at is null
      and s.expires_at > now()
      and p.status='active'
      and o.status='active'
    limit 1
  `;
  if (!rows[0]) return null;

  await sql`
    update lti_launch_sessions set last_seen_at=now()
    where id=${String(rows[0].id)}
  `;
  return rows[0] as Record<string, unknown>;
}

export async function getLtiSessionUser() {
  const session = await getCurrentLtiSession();
  if (!session?.auth_subject) return null;
  return {
    id: String(session.auth_subject),
    name: session.display_name ? String(session.display_name) : "",
    email: undefined,
    emailVerified: false,
    image: null,
    lti: true,
  };
}
