import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import { LTI_CLAIMS, LTI_MESSAGE_TYPES, LTI_VERSION } from "@/lib/lti/constants";
import { signToolJwt } from "@/lib/lti/crypto";
import { getCurrentLtiSession } from "@/lib/lti/session";
import { assertSafeExternalHttpsUrl } from "@/lib/lti/url-security";

export const dynamic = "force-dynamic";

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: Request) {
  const session = await getCurrentLtiSession();
  if (!session || String(session.message_type) !== LTI_MESSAGE_TYPES.deepLinkRequest) {
    return new Response("LTI deep-link session is unavailable or expired.", { status: 401 });
  }
  if (!["teacher","platform_admin"].includes(String(session.account_type))) {
    return new Response("Instructor access required.", { status: 403 });
  }

  const form = await request.formData();
  const bookCode = String(form.get("bookCode") || "").trim().slice(0, 80);
  if (!bookCode) return new Response("A Career Compass book is required.", { status: 400 });

  const sql = getDb();
  const rows = await sql`
    select code, title_en, title_vi
    from books
    where code=${bookCode} and status='published'
    limit 1
  `;
  const book = rows[0];
  if (!book) return new Response("Published book not found.", { status: 404 });

  const settings = record(session.deep_link_settings);
  const returnUrl = typeof settings.deep_link_return_url === "string" ? settings.deep_link_return_url : "";
  if (!returnUrl) return new Response("The LMS did not provide a deep-link return URL.", { status: 409 });

  try {
    await assertSafeExternalHttpsUrl(returnUrl);
  } catch {
    return new Response("The LMS deep-link return URL is not allowed.", { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const targetPath = `/learn/${encodeURIComponent(String(book.code))}`;
  const contentItem: Record<string, unknown> = {
    type: "ltiResourceLink",
    title: String(book.title_en),
    text: String(book.title_vi || book.title_en),
    url: absoluteUrl("/api/lti/launch"),
    custom: { ccj_target: targetPath },
  };
  if (settings.accept_lineitem === true) {
    contentItem.lineItem = {
      label: String(book.title_en),
      scoreMaximum: 100,
      resourceId: `career-compass-book:${String(book.code)}`,
      tag: "career-compass-junior",
      gradesReleased: true,
    };
  }

  const payload: Record<string, unknown> = {
    iss: String(session.client_id),
    aud: String(session.issuer),
    iat: now,
    exp: now + 300,
    jti: randomUUID(),
    [LTI_CLAIMS.deploymentId]: String(session.deployment_id),
    [LTI_CLAIMS.messageType]: LTI_MESSAGE_TYPES.deepLinkResponse,
    [LTI_CLAIMS.version]: LTI_VERSION,
    [LTI_CLAIMS.contentItems]: [contentItem],
  };
  if (typeof settings.data === "string") {
    payload[LTI_CLAIMS.deepLinkData] = settings.data;
  }

  const jwt = signToolJwt(payload);
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Returning to LMS</title></head>
<body>
<form id="lti-return" method="post" action="${htmlEscape(returnUrl)}">
  <input type="hidden" name="JWT" value="${htmlEscape(jwt)}">
  <noscript><button type="submit">Return to LMS</button></noscript>
</form>
<script>document.getElementById("lti-return").submit();</script>
</body></html>`;

  await sql`
    insert into integration_audit_log (
      organization_id, installation_id, actor_profile_id, action, detail
    ) values (
      ${String(session.organization_id)}, ${String(session.installation_id)},
      ${String(session.profile_id)}, 'lti.deep_link.responded',
      ${JSON.stringify({ bookCode: String(book.code), lineItemRequested: settings.accept_lineitem === true })}::jsonb
    )
  `;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; form-action https:; base-uri 'none'",
    },
  });
}
