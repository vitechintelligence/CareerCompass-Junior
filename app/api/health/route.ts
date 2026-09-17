import { NextResponse } from "next/server";
import { getAuthConfigurationStatus } from "@/lib/auth/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const auth = getAuthConfigurationStatus();
  const authStatus = {
    configured: auth.configured,
    baseUrlConfigured: auth.baseUrlConfigured,
    baseUrlValid: auth.baseUrlValid,
    cookieSecretConfigured: auth.cookieSecretConfigured,
    cookieSecretValid: auth.cookieSecretValid,
    missing: auth.missing,
    invalid: auth.invalid,
  };

  if (!hasDatabase) {
    return NextResponse.json({
      ok: true,
      app: "career-compass-junior-mastery",
      database: "not-configured",
      auth: authStatus,
    }, { headers: noStore });
  }

  try {
    const sql = getDb();
    const result = await sql`select now() as server_time`;
    return NextResponse.json({
      ok: true,
      app: "career-compass-junior-mastery",
      database: "connected",
      serverTime: result[0]?.server_time ?? null,
      auth: authStatus,
    }, { headers: noStore });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        app: "career-compass-junior-mastery",
        database: "unreachable",
        auth: authStatus,
      },
      { status: 503, headers: noStore },
    );
  }
}
