import "server-only";

import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import { LTI_CLAIMS, LTI_MESSAGE_TYPES, LTI_VERSION } from "@/lib/lti/constants";
import { audienceAllowsClient, normalizeExternalId, safeCareerCompassTargetPath, stableHash } from "@/lib/lti/policy";
import { verifyPlatformJwtSignature, type JwtPayload } from "@/lib/lti/crypto";
import { getLtiRegistrationById, type LtiPlatformRegistration } from "@/lib/lti/runtime";

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function randomLtiOpaqueValue() {
  return randomBytes(32).toString("base64url");
}

export async function createOidcState(input: {
  registration: LtiPlatformRegistration;
  targetLinkUri: string;
}) {
  const state = randomLtiOpaqueValue();
  const nonce = randomLtiOpaqueValue();
  const sql = getDb();
  await sql`
    insert into lti_oidc_states (
      registration_id, state_hash, nonce_hash, target_link_uri, expires_at
    ) values (
      ${input.registration.id}, ${stableHash(state)}, ${stableHash(nonce)},
      ${input.targetLinkUri}, now() + interval '10 minutes'
    )
  `;
  return { state, nonce };
}

function validateTimes(payload: JwtPayload) {
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp);
  const iat = Number(payload.iat);
  if (!Number.isFinite(exp) || exp < now - 30) throw new Error("lti_id_token_expired");
  if (!Number.isFinite(iat) || iat > now + 60 || iat < now - 600) throw new Error("lti_id_token_iat_invalid");
}

export async function validateLtiLaunch(input: {
  state: string;
  idToken: string;
}) {
  const sql = getDb();
  const states = await sql`
    select id, registration_id, nonce_hash, target_link_uri, expires_at, consumed_at
    from lti_oidc_states
    where state_hash=${stableHash(input.state)}
    limit 1
  `;
  const state = states[0] as Record<string, unknown> | undefined;
  if (!state || state.consumed_at) throw new Error("lti_state_invalid");
  if (new Date(String(state.expires_at)).valueOf() <= Date.now()) throw new Error("lti_state_expired");

  const registration = await getLtiRegistrationById(String(state.registration_id));
  if (!registration) throw new Error("lti_registration_not_active");

  const payload = await verifyPlatformJwtSignature(input.idToken, registration.jwksUrl);
  if (String(payload.iss || "") !== registration.issuer) throw new Error("lti_issuer_mismatch");
  if (!audienceAllowsClient(payload.aud, payload.azp, registration.clientId)) throw new Error("lti_audience_mismatch");
  validateTimes(payload);

  const nonce = normalizeExternalId(payload.nonce, 1000);
  if (!nonce || stableHash(nonce) !== String(state.nonce_hash)) throw new Error("lti_nonce_mismatch");

  if (String(payload[LTI_CLAIMS.version] || "") !== LTI_VERSION) throw new Error("lti_version_invalid");
  if (String(payload[LTI_CLAIMS.deploymentId] || "") !== registration.deploymentId) {
    throw new Error("lti_deployment_mismatch");
  }

  const messageType = String(payload[LTI_CLAIMS.messageType] || "");
  if (![LTI_MESSAGE_TYPES.resourceLink, LTI_MESSAGE_TYPES.deepLinkRequest].includes(messageType as never)) {
    throw new Error("lti_message_type_invalid");
  }

  const expectedTarget = absoluteUrl("/api/lti/launch");
  const signedTarget = String(payload[LTI_CLAIMS.targetLinkUri] || "");
  if (signedTarget !== expectedTarget || String(state.target_link_uri) !== expectedTarget) {
    throw new Error("lti_target_link_mismatch");
  }

  const consumed = await sql`
    update lti_oidc_states
    set consumed_at=now()
    where id=${String(state.id)}
      and consumed_at is null
    returning id
  `;
  if (!consumed[0]) throw new Error("lti_state_replayed");

  const resourceLink = record(payload[LTI_CLAIMS.resourceLink]);
  const custom = record(payload[LTI_CLAIMS.custom]);
  const ags = record(payload[LTI_CLAIMS.agsEndpoint]);
  const nrps = record(payload[LTI_CLAIMS.nrps]);
  const deepLinkSettings = record(payload[LTI_CLAIMS.deepLinkSettings]);

  return {
    registration,
    payload,
    messageType: messageType as "LtiResourceLinkRequest" | "LtiDeepLinkingRequest",
    externalResourceLinkId: normalizeExternalId(resourceLink.id, 500) || null,
    targetPath: safeCareerCompassTargetPath(custom.ccj_target),
    serviceClaims: {
      ags,
      nrps,
    },
    deepLinkSettings,
  };
}
