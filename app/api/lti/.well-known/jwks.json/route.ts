import { NextResponse } from "next/server";
import { toolJwks } from "@/lib/lti/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(toolJwks(), {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    });
  } catch {
    return NextResponse.json(
      { error: "LTI Tool signing key is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
