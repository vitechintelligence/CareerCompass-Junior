import { NextResponse } from "next/server";
import { EvaluationError } from "@/lib/learning/objective-evaluation";
import { readBoundedJson } from "@/lib/learning/request-json";
import { POST as recordEvidence } from "@/app/api/learning/attempt/route";

export const dynamic = "force-dynamic";

/** Legacy lesson bridge. Its local completion marker is a self-report, never mastery. */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    const value = await readBoundedJson(request, 8192);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }
    payload = value as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: error instanceof EvaluationError ? error.code : "invalid_json" },
      { status: error instanceof EvaluationError ? error.status : 400 });
  }

  const lessonId = payload.lessonId;
  if (typeof lessonId !== "number" || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 8 || payload.completed !== true) {
    return NextResponse.json({ error: "invalid_lesson_self_check" }, { status: 400 });
  }
  // The canonical route evaluates the published activity and ignores any client
  // score, correct, or completion fields. No duplicate write policy lives here.
  return recordEvidence(new Request(request.url.replace("/unit-1/attempt", "/attempt"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bookCode: "CCJ-MASTERY-BEGINNER", unitCode: "U01",
      activityCode: `U01-L${String(lessonId).padStart(2, "0")}`,
      locale: payload.locale === "en" ? "en" : "vi",
      response: { selfReported: true, source: "interactive-unit-1" },
    }),
  }));
}
