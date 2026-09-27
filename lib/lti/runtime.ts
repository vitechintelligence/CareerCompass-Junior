import "server-only";

import { getDb } from "@/lib/db";
import { normalizeExternalId } from "@/lib/lti/policy";

export type LtiPlatformRegistration = {
  id: string;
  installationId: string;
  organizationId: string;
  platformName: string;
  issuer: string;
  clientId: string;
  deploymentId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  jwksUrl: string;
  status: string;
};

function registrationFromRow(row: Record<string, unknown>): LtiPlatformRegistration {
  return {
    id: String(row.id),
    installationId: String(row.installation_id),
    organizationId: String(row.organization_id),
    platformName: String(row.platform_name),
    issuer: String(row.issuer),
    clientId: String(row.client_id),
    deploymentId: String(row.deployment_id),
    authLoginUrl: String(row.auth_login_url),
    authTokenUrl: String(row.auth_token_url),
    jwksUrl: String(row.jwks_url),
    status: String(row.status),
  };
}

export async function getLtiRegistrationById(id: string) {
  const sql = getDb();
  const rows = await sql`
    select r.*
    from lti_platform_registrations r
    join organizations o on o.id=r.organization_id
    join integration_installations i on i.id=r.installation_id
    where r.id=${id}
      and r.status='active'
      and o.status='active'
      and i.status in ('pending','configured','active')
    limit 1
  `;
  return rows[0] ? registrationFromRow(rows[0] as Record<string, unknown>) : null;
}

export async function resolveLtiRegistrationForLogin(issuerInput: string, clientIdInput?: string) {
  const issuer = normalizeExternalId(issuerInput, 1000);
  const clientId = normalizeExternalId(clientIdInput, 500);
  if (!issuer) return null;

  const sql = getDb();
  const rows = clientId
    ? await sql`
        select r.*
        from lti_platform_registrations r
        join organizations o on o.id=r.organization_id
        join integration_installations i on i.id=r.installation_id
        where r.issuer=${issuer}
          and r.client_id=${clientId}
          and r.status='active'
          and o.status='active'
          and i.status in ('pending','configured','active')
        order by r.updated_at desc
        limit 2
      `
    : await sql`
        select r.*
        from lti_platform_registrations r
        join organizations o on o.id=r.organization_id
        join integration_installations i on i.id=r.installation_id
        where r.issuer=${issuer}
          and r.status='active'
          and o.status='active'
          and i.status in ('pending','configured','active')
        order by r.updated_at desc
        limit 2
      `;

  if (rows.length !== 1) return null;
  return registrationFromRow(rows[0] as Record<string, unknown>);
}
