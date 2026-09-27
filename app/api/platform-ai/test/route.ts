import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { platformAiRuntime, runPlatformOpenAiConnectivityTest } from "@/lib/platform-ai-runtime";

export const dynamic = "force-dynamic";

export async function POST() {
  const admin = await requirePlatformAdmin();
  const sql = getDb();
  const runtime = platformAiRuntime();

  if (runtime.mode === "openai") {
    const usage = await sql`
      select count(*)::int as count
      from admin_audit_events
      where actor_profile_id=${admin.profile.id}
        and event_type='platform_ai_test_live'
        and created_at >= date_trunc('day', now())
    `;
    const usedToday = Number(usage[0]?.count || 0);
    if (usedToday >= runtime.dailyRequestCap) {
      const result = {
        ok: true,
        provider: "mock" as const,
        model: runtime.model,
        message: "Daily OpenAI test cap reached. Career Compass continues in zero-cost mock mode.",
        reason: "daily_test_cap_reached",
      };
      return NextResponse.json({ ...result, usedToday, dailyRequestCap: runtime.dailyRequestCap });
    }
  }

  const result = await runPlatformOpenAiConnectivityTest();
  await sql`
    insert into admin_audit_events (
      actor_profile_id, event_type, target_type, target_id, detail
    )
    values (
      ${admin.profile.id},
      ${result.provider === "openai" ? "platform_ai_test_live" : "platform_ai_test_mock"},
      'platform_ai',
      ${result.model},
      ${JSON.stringify({
        provider: result.provider,
        model: result.model,
        reason: result.reason,
        openaiStatus: result.openaiStatus || null,
        containsStudentContent: false,
      })}::jsonb
    )
  `;

  return NextResponse.json({
    ...result,
    dailyRequestCap: runtime.dailyRequestCap,
    environment: process.env.VERCEL_ENV || "local",
  });
}
