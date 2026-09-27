import { NextResponse } from "next/server";
import { postAgsScore } from "@/lib/lti/service-client";
import { getCurrentLtiSession } from "@/lib/lti/session";

export const dynamic = "force-dynamic";

const ACTIVITY = new Set(["Initialized","Started","InProgress","Submitted","Completed"]);
const GRADING = new Set(["NotReady","Failed","Pending","PendingManual","FullyGraded"]);

export async function POST(request: Request) {
  const session = await getCurrentLtiSession();
  if (!session) return NextResponse.json({ error: "Active LTI session required." }, { status: 401 });
  if (String(session.account_type) !== "student") {
    return NextResponse.json({ error: "Learner LTI session required for score passback." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const scoreGiven = Number(body.scoreGiven);
  const scoreMaximum = Number(body.scoreMaximum);
  const activityProgress = String(body.activityProgress || "Completed");
  const gradingProgress = String(body.gradingProgress || "FullyGraded");

  if (!Number.isFinite(scoreGiven) || !Number.isFinite(scoreMaximum) ||
      scoreGiven < 0 || scoreMaximum <= 0 || scoreGiven > scoreMaximum ||
      !ACTIVITY.has(activityProgress) || !GRADING.has(gradingProgress)) {
    return NextResponse.json({ error: "Invalid AGS score payload." }, { status: 400 });
  }

  try {
    await postAgsScore(session, {
      scoreGiven,
      scoreMaximum,
      activityProgress: activityProgress as "Initialized" | "Started" | "InProgress" | "Submitted" | "Completed",
      gradingProgress: gradingProgress as "NotReady" | "Failed" | "Pending" | "PendingManual" | "FullyGraded",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "lti_ags_score_failed",
    }, { status: 502 });
  }
}
