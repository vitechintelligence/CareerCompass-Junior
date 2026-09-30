import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import { LTI_CLAIMS, LTI_MESSAGE_TYPES, LTI_SESSION_COOKIE } from "@/lib/lti/constants";
import { normalizeExternalId } from "@/lib/lti/policy";
import { validateLtiLaunch } from "@/lib/lti/launch";
import { provisionLtiActor } from "@/lib/lti/provisioning";
import {
  createLtiLaunchSession,
  LTI_FRAME_HOST_COOKIE,
  ltiFrameCookieOptions,
  ltiSessionCookieOptions,
} from "@/lib/lti/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const state = normalizeExternalId(form.get("state"), 2000);
    const idToken = normalizeExternalId(form.get("id_token"), 20000);
    if (!state || !idToken) {
      return NextResponse.json({ error: "LTI state and id_token are required." }, { status: 400 });
    }

    const launch = await validateLtiLaunch({ state, idToken });
    const actor = await provisionLtiActor(launch.registration, launch.payload);
    const context = launch.payload[LTI_CLAIMS.context];
    const externalContextId =
      context && typeof context === "object" && !Array.isArray(context)
        ? normalizeExternalId((context as Record<string, unknown>).id, 500) || null
        : null;

    const session = await createLtiLaunchSession({
      registration: launch.registration,
      profileId: actor.profileId,
      classId: actor.classId,
      messageType: launch.messageType,
      externalContextId,
      externalResourceLinkId: launch.externalResourceLinkId,
      launchNonce: launch.launchNonce,
      serviceClaims: launch.serviceClaims,
      deepLinkSettings: launch.deepLinkSettings,
      targetPath: launch.targetPath,
    });

    const sql = getDb();
    await sql`
      insert into integration_audit_log (
        organization_id, installation_id, actor_profile_id, action, detail
      ) values (
        ${launch.registration.organizationId}, ${launch.registration.installationId},
        ${actor.profileId}, 'lti.launch.validated',
        ${JSON.stringify({
          messageType: launch.messageType,
          classId: actor.classId,
          externalContextPresent: Boolean(externalContextId),
          externalResourceLinkPresent: Boolean(launch.externalResourceLinkId),
        })}::jsonb
      )
    `;

    const destination = launch.messageType === LTI_MESSAGE_TYPES.deepLinkRequest
      ? absoluteUrl("/lti/deep-link")
      : absoluteUrl(launch.targetPath);
    const response = NextResponse.redirect(destination, 303);
    response.cookies.set(LTI_SESSION_COOKIE, session.token, ltiSessionCookieOptions);
    if (launch.frameAncestorHost) {
      response.cookies.set(LTI_FRAME_HOST_COOKIE, launch.frameAncestorHost, ltiFrameCookieOptions);
    }
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "lti_launch_failed";
    return NextResponse.json({ error: code }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
