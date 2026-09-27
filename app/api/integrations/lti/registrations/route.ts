import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import { getManagedOrganization } from "@/lib/integration-runtime";
import { assertSafeExternalHttpsUrl } from "@/lib/lti/url-security";
import { normalizeExternalId } from "@/lib/lti/policy";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toolConfiguration() {
  return {
    oidcLoginUrl: absoluteUrl("/api/lti/oidc/login"),
    redirectUris: [absoluteUrl("/api/lti/launch")],
    launchUrl: absoluteUrl("/api/lti/launch"),
    deepLinkLaunchUrl: absoluteUrl("/api/lti/launch"),
    jwksUrl: absoluteUrl("/api/lti/.well-known/jwks.json"),
    supportedMessageTypes: ["LtiResourceLinkRequest", "LtiDeepLinkingRequest"],
    supportedServices: ["Deep Linking 2.0", "NRPS 2.0", "AGS 2.0"],
    publicKeyAlgorithm: "RS256",
  };
}

async function installationForOrganization(organizationId: string, installationId: string) {
  const sql = getDb();
  const rows = await sql`
    select i.id, i.status, p.slug, p.protocol, p.display_name
    from integration_installations i
    join integration_providers p on p.id=i.provider_id
    where i.id=${installationId}
      and i.organization_id=${organizationId}
      and p.protocol='lti_1_3'
      and p.status in ('available','beta')
      and i.status in ('pending','configured','active')
    limit 1
  `;
  return rows[0] as Record<string, unknown> | undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = normalizeExternalId(url.searchParams.get("organizationId"), 100);
  const installationId = normalizeExternalId(url.searchParams.get("installationId"), 100);
  const access = await getManagedOrganization(organizationId || null);
  if (!access) return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });
  if (!UUID_RE.test(installationId)) {
    return NextResponse.json({ error: "A valid LTI installationId is required." }, { status: 400 });
  }

  const installation = await installationForOrganization(access.organization.id, installationId);
  if (!installation) return NextResponse.json({ error: "LTI installation not found." }, { status: 404 });

  try {
    const sql = getDb();
    const rows = await sql`
      select id, platform_name, issuer, client_id, deployment_id,
             auth_login_url, auth_token_url, jwks_url, status, created_at, updated_at
      from lti_registrations
      where installation_id=${installationId}
        and organization_id=${access.organization.id}
      limit 1
    `;
    return NextResponse.json({
      organization: access.organization,
      installation: {
        id: installationId,
        providerSlug: String(installation.slug),
        providerName: String(installation.display_name),
      },
      registration: rows[0] || null,
      tool: toolConfiguration(),
    });
  } catch {
    return NextResponse.json({
      error: "LTI schema is not active yet. Review and apply migration 008 before configuring a live registration.",
      code: "lti_schema_not_ready",
      tool: toolConfiguration(),
    }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const organizationId = normalizeExternalId(payload.organizationId, 100);
  const installationId = normalizeExternalId(payload.installationId, 100);
  const access = await getManagedOrganization(organizationId || null);
  if (!access) return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });
  if (!UUID_RE.test(installationId)) {
    return NextResponse.json({ error: "A valid LTI installationId is required." }, { status: 400 });
  }

  const installation = await installationForOrganization(access.organization.id, installationId);
  if (!installation) return NextResponse.json({ error: "LTI installation not found." }, { status: 404 });

  const platformName = normalizeExternalId(payload.platformName, 160);
  const issuer = normalizeExternalId(payload.issuer, 1000);
  const clientId = normalizeExternalId(payload.clientId, 500);
  const deploymentId = normalizeExternalId(payload.deploymentId, 500);
  const authLoginUrl = normalizeExternalId(payload.authLoginUrl, 2000);
  const authTokenUrl = normalizeExternalId(payload.authTokenUrl, 2000);
  const jwksUrl = normalizeExternalId(payload.jwksUrl, 2000);

  if (!platformName || !issuer || !clientId || !deploymentId || !authLoginUrl || !authTokenUrl || !jwksUrl) {
    return NextResponse.json({ error: "Complete all LTI platform registration fields." }, { status: 400 });
  }

  try {
    await Promise.all([
      assertSafeExternalHttpsUrl(authLoginUrl),
      assertSafeExternalHttpsUrl(authTokenUrl),
      assertSafeExternalHttpsUrl(jwksUrl),
    ]);
    const issuerUrl = new URL(issuer);
    if (issuerUrl.protocol !== "https:" || issuerUrl.username || issuerUrl.password) {
      throw new Error("bad issuer");
    }
  } catch {
    return NextResponse.json({ error: "LTI issuer and service endpoints must be safe public HTTPS URLs." }, { status: 400 });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      insert into lti_registrations (
        installation_id, organization_id, platform_name, issuer, client_id, deployment_id,
        auth_login_url, auth_token_url, jwks_url, status, created_by
      ) values (
        ${installationId}, ${access.organization.id}, ${platformName}, ${issuer}, ${clientId},
        ${deploymentId}, ${authLoginUrl}, ${authTokenUrl}, ${jwksUrl}, 'active', ${access.profile.id}
      )
      on conflict (installation_id) do update set
        platform_name=excluded.platform_name,
        issuer=excluded.issuer,
        client_id=excluded.client_id,
        deployment_id=excluded.deployment_id,
        auth_login_url=excluded.auth_login_url,
        auth_token_url=excluded.auth_token_url,
        jwks_url=excluded.jwks_url,
        status='active',
        updated_at=now()
      returning id, status, created_at, updated_at
    `;

    await sql`
      update integration_installations
      set status='configured', health_state='unknown', updated_at=now()
      where id=${installationId}
        and organization_id=${access.organization.id}
    `;

    await sql`
      insert into integration_audit_log (
        organization_id, installation_id, actor_profile_id, action, detail
      ) values (
        ${access.organization.id}, ${installationId}, ${access.profile.id},
        'lti.registration.configured',
        ${JSON.stringify({
          platformName,
          issuer,
          clientId,
          deploymentId,
          secretsStored: false,
        })}::jsonb
      )
    `;

    return NextResponse.json({
      ok: true,
      registration: rows[0],
      tool: toolConfiguration(),
      note: "No platform secret was stored. LTI 1.3 uses asymmetric keys and the registered platform JWKS.",
    }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && error.message.includes("lti_registrations")
      ? "lti_schema_not_ready"
      : "lti_registration_conflict";
    return NextResponse.json({
      error: code === "lti_schema_not_ready"
        ? "LTI schema is not active yet. Apply migration 008 after review."
        : "Unable to save this LTI registration. Check issuer/client/deployment uniqueness.",
      code,
    }, { status: code === "lti_schema_not_ready" ? 503 : 409 });
  }
}
