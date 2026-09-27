import "server-only";

import { getDb } from "@/lib/db";
import { LTI_SCOPES } from "@/lib/lti/constants";
import { signedClientAssertion } from "@/lib/lti/crypto";
import { assertSafeExternalHttpsUrl } from "@/lib/lti/url-security";

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function serviceClaims(session: Record<string, unknown>) {
  return record(session.service_claims);
}

async function platformAccessToken(session: Record<string, unknown>, scopes: string[]) {
  const clientId = String(session.client_id || "");
  const tokenUrl = String(session.auth_token_url || "");
  if (!clientId || !tokenUrl) throw new Error("lti_service_registration_incomplete");

  const safeUrl = await assertSafeExternalHttpsUrl(tokenUrl);
  const assertion = signedClientAssertion({
    clientId,
    audience: safeUrl.toString(),
    deploymentId: String(session.deployment_id || "") || undefined,
  });
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: assertion,
    scope: scopes.join(" "),
  });

  const response = await fetch(safeUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`lti_oauth_token_failed_${response.status}`);
  const payload = await response.json() as Record<string, unknown>;
  const token = typeof payload.access_token === "string" ? payload.access_token : "";
  if (!token) throw new Error("lti_oauth_token_missing");
  return token;
}

function parseNextLink(header: string | null) {
  if (!header) return null;
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function fetchNrpsMembers(session: Record<string, unknown>) {
  const claims = serviceClaims(session);
  const nrps = record(claims.nrps);
  const membershipUrl = typeof nrps.context_memberships_url === "string" ? nrps.context_memberships_url : "";
  const serviceVersions = Array.isArray(nrps.service_versions) ? nrps.service_versions.map(String) : [];
  if (!membershipUrl || (serviceVersions.length && !serviceVersions.includes("2.0"))) {
    throw new Error("lti_nrps_not_available");
  }

  const token = await platformAccessToken(session, [LTI_SCOPES.nrpsContextMembershipReadonly]);
  const initialUrl = await assertSafeExternalHttpsUrl(membershipUrl);
  const allowedOrigin = initialUrl.origin;
  const members: Record<string, unknown>[] = [];
  let next: string | null = initialUrl.toString();
  let pages = 0;

  while (next && pages < 20) {
    const url = await assertSafeExternalHttpsUrl(next);
    if (url.origin !== allowedOrigin) throw new Error("lti_nrps_pagination_origin_mismatch");
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.ims.lti-nrps.v2.membershipcontainer+json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`lti_nrps_failed_${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    if (Array.isArray(payload.members)) {
      for (const member of payload.members) {
        if (member && typeof member === "object" && !Array.isArray(member)) {
          members.push(member as Record<string, unknown>);
        }
      }
    }
    next = parseNextLink(response.headers.get("link"));
    pages += 1;
  }

  return members;
}

export async function createAgsLineItem(
  session: Record<string, unknown>,
  input: { label: string; scoreMaximum: number; resourceId: string; tag?: string },
) {
  const claims = serviceClaims(session);
  const ags = record(claims.ags);
  const lineitemsUrl = typeof ags.lineitems === "string" ? ags.lineitems : "";
  const scopes = Array.isArray(ags.scope) ? ags.scope.map(String) : [];
  if (!lineitemsUrl || !scopes.includes(LTI_SCOPES.agsLineitem)) throw new Error("lti_ags_lineitem_not_available");

  const token = await platformAccessToken(session, [LTI_SCOPES.agsLineitem]);
  const url = await assertSafeExternalHttpsUrl(lineitemsUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.ims.lis.v2.lineitem+json",
      "Content-Type": "application/vnd.ims.lis.v2.lineitem+json",
    },
    body: JSON.stringify({
      label: input.label.slice(0, 180),
      scoreMaximum: Math.max(0.01, Math.min(Number(input.scoreMaximum), 1000000)),
      resourceId: input.resourceId.slice(0, 255),
      tag: input.tag?.slice(0, 255),
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`lti_ags_lineitem_failed_${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function postAgsScore(
  session: Record<string, unknown>,
  input: {
    scoreGiven: number;
    scoreMaximum: number;
    activityProgress: "Initialized" | "Started" | "InProgress" | "Submitted" | "Completed";
    gradingProgress: "NotReady" | "Failed" | "Pending" | "PendingManual" | "FullyGraded";
  },
) {
  const claims = serviceClaims(session);
  const ags = record(claims.ags);
  const lineitem = typeof ags.lineitem === "string" ? ags.lineitem : "";
  const scopes = Array.isArray(ags.scope) ? ags.scope.map(String) : [];
  if (!lineitem || !scopes.includes(LTI_SCOPES.agsScore)) throw new Error("lti_ags_score_not_available");

  const sql = getDb();
  const identity = await sql`
    select external_user_id
    from external_identity_links
    where installation_id=${String(session.installation_id)}
      and profile_id=${String(session.profile_id)}
    limit 1
  `;
  const userId = identity[0]?.external_user_id ? String(identity[0].external_user_id) : "";
  if (!userId) throw new Error("lti_external_identity_missing");

  const token = await platformAccessToken(session, [LTI_SCOPES.agsScore]);
  const scoreUrl = await assertSafeExternalHttpsUrl(`${lineitem.replace(/\/$/, "")}/scores`);
  const response = await fetch(scoreUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.ims.lis.v1.score+json",
    },
    body: JSON.stringify({
      userId,
      scoreGiven: Math.max(0, Number(input.scoreGiven)),
      scoreMaximum: Math.max(0.01, Number(input.scoreMaximum)),
      activityProgress: input.activityProgress,
      gradingProgress: input.gradingProgress,
      timestamp: new Date().toISOString(),
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`lti_ags_score_failed_${response.status}`);
  return { ok: true };
}
