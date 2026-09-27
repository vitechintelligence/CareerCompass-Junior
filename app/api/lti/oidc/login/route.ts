import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { allowedLtiTargetLinkUri, normalizeExternalId } from "@/lib/lti/policy";
import { assertSafeExternalHttpsUrl } from "@/lib/lti/url-security";
import { createOidcState } from "@/lib/lti/launch";
import { resolveLtiRegistrationForLogin } from "@/lib/lti/runtime";

export const dynamic = "force-dynamic";

async function readParams(request: Request) {
  if (request.method === "POST") {
    const form = await request.formData();
    return new URLSearchParams(Array.from(form.entries()).map(([key, value]) => [key, String(value)]));
  }
  return new URL(request.url).searchParams;
}

async function initiate(request: Request) {
  try {
    const params = await readParams(request);
    const issuer = normalizeExternalId(params.get("iss"), 1000);
    const loginHint = normalizeExternalId(params.get("login_hint"), 2000);
    const targetLinkUri = normalizeExternalId(params.get("target_link_uri"), 2000);
    const ltiMessageHint = normalizeExternalId(params.get("lti_message_hint"), 4000);
    const clientId = normalizeExternalId(params.get("client_id"), 500);

    if (!issuer || !loginHint || !targetLinkUri || !allowedLtiTargetLinkUri(targetLinkUri)) {
      return NextResponse.json({ error: "Invalid LTI OIDC login initiation request." }, { status: 400 });
    }

    const registration = await resolveLtiRegistrationForLogin(issuer, clientId || undefined);
    if (!registration) {
      return NextResponse.json({ error: "No active LTI registration matches this issuer/client." }, { status: 404 });
    }

    const authorizationUrl = await assertSafeExternalHttpsUrl(registration.authLoginUrl);
    const { state, nonce } = await createOidcState({
      registration,
      targetLinkUri: absoluteUrl("/api/lti/launch"),
    });

    authorizationUrl.searchParams.set("scope", "openid");
    authorizationUrl.searchParams.set("response_type", "id_token");
    authorizationUrl.searchParams.set("response_mode", "form_post");
    authorizationUrl.searchParams.set("prompt", "none");
    authorizationUrl.searchParams.set("client_id", registration.clientId);
    authorizationUrl.searchParams.set("redirect_uri", absoluteUrl("/api/lti/launch"));
    authorizationUrl.searchParams.set("login_hint", loginHint);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);
    if (ltiMessageHint) authorizationUrl.searchParams.set("lti_message_hint", ltiMessageHint);

    return NextResponse.redirect(authorizationUrl, 302);
  } catch {
    return NextResponse.json({ error: "Unable to initiate LTI login." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  return initiate(request);
}

export async function POST(request: Request) {
  return initiate(request);
}
