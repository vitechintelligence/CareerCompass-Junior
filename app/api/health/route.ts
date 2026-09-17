import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDatabase = Boolean(process.env.DATABASE_URL);

  if (!hasDatabase) {
    return NextResponse.json({
      ok: true,
      app: "career-compass-junior-mastery",
      database: "not-configured",
    });
  }

  try {
    const sql = getDb();
    const result = await sql`select now() as server_time`;
    return NextResponse.json({
      ok: true,
      app: "career-compass-junior-mastery",
      database: "connected",
      serverTime: result[0]?.server_time ?? null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, app: "career-compass-junior-mastery", database: "unreachable" },
      { status: 503 },
    );
  }
}
