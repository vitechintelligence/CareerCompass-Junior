import { NextResponse } from "next/server";
import { createAgsLineItem } from "@/lib/lti/service-client";
import { getCurrentLtiSession } from "@/lib/lti/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentLtiSession();
  if (!session) return NextResponse.json({ error: "Active LTI session required." }, { status: 401 });
  if (!["teacher","platform_admin"].includes(String(session.account_type))) {
    return NextResponse.json({ error: "Instructor LTI session required." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const label = String(body.label || "").trim();
  const resourceId = String(body.resourceId || "").trim();
  const scoreMaximum = Number(body.scoreMaximum);
  const tag = String(body.tag || "").trim();
  if (!label || !resourceId || !Number.isFinite(scoreMaximum) || scoreMaximum <= 0) {
    return NextResponse.json({ error: "label, resourceId and positive scoreMaximum are required." }, { status: 400 });
  }

  try {
    const lineItem = await createAgsLineItem(session, { label, resourceId, scoreMaximum, tag: tag || undefined });
    return NextResponse.json({ ok: true, lineItem }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "lti_ags_lineitem_failed",
    }, { status: 502 });
  }
}
