import { NextResponse } from "next/server";
import { revokeCurrentLtiSession } from "@/lib/lti/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await revokeCurrentLtiSession();
    return NextResponse.json({ ok: true, hadSession: result.hadSession }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, hadSession: false }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
