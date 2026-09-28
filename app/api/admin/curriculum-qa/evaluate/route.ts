import { NextResponse } from "next/server";
import { getPlatformAdminContext } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { evaluateActivityEvidence, EvidencePolicyError } from "@/lib/learning/evidence-policy";
import { buildActivityContract, learnerActivityContract } from "@/lib/learning/activity-contract";
import { readBoundedJson } from "@/lib/learning/request-json";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const admin = await getPlatformAdminContext();
  if (!admin) return NextResponse.json({ error: "platform_admin_required" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    const parsed = await readBoundedJson(request, 32 * 1024);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "invalid_qa_test_payload" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_qa_test_payload" }, { status: 400 });
  }

  const activityId = typeof body.activityId === "string" ? body.activityId : "";
  if (!UUID_RE.test(activityId)) return NextResponse.json({ error: "invalid_activity_id" }, { status: 400 });

  const sql = getDb();
  const rows = await sql`
    select
      a.id, a.code, a.activity_type, a.content, a.content_version, a.max_score,
      a.instructions_en, a.instructions_vi,
      b.code as book_code, b.age_band, b.level_label,
      bu.code as unit_code, bu.objective_en, bu.objective_vi
    from activities a
    join book_units bu on bu.id=a.unit_id
    join books b on b.id=bu.book_id
    where a.id=${activityId}
    limit 1
  `;
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "activity_not_found" }, { status: 404 });

  const contract = buildActivityContract({
    activityId: String(row.id),
    activityCode: String(row.code),
    courseId: String(row.book_code),
    unitId: String(row.unit_code),
    activityType: String(row.activity_type),
    contentVersion: Number(row.content_version || 1),
    ageBand: row.age_band ? String(row.age_band) : null,
    englishLevel: row.level_label ? String(row.level_label) : null,
    objectiveEn: row.objective_en ? String(row.objective_en) : null,
    objectiveVi: row.objective_vi ? String(row.objective_vi) : null,
    instructionsEn: row.instructions_en ? String(row.instructions_en) : null,
    instructionsVi: row.instructions_vi ? String(row.instructions_vi) : null,
    content: row.content,
  });

  try {
    const evaluation = evaluateActivityEvidence(
      { activityType: String(row.activity_type), content: row.content, maxScore: row.max_score },
      body.response,
    );
    return NextResponse.json({
      ok: true,
      persistence: "not_saved",
      activity: learnerActivityContract(contract, null).activity,
      evaluation,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof EvidencePolicyError) {
      return NextResponse.json({ error: error.code, persistence: "not_saved" }, { status: error.status });
    }
    throw error;
  }
}
