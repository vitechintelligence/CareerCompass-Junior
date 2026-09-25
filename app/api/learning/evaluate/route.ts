import { evaluateBeginnerSubmission } from "@/lib/learning/beginner-objectives";
import { EvaluationError } from "@/lib/learning/objective-evaluation";
import { readBoundedJson } from "@/lib/learning/request-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public preview evaluation is intentionally side-effect free. It awards no account evidence. */
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  try {
    const evaluation = evaluateBeginnerSubmission(await readBoundedJson(request));
    return Response.json({ evaluation, persistence: "not_saved", evidenceSaved: false }, { headers });
  } catch (error) {
    if (error instanceof EvaluationError) {
      return Response.json({ error: error.code }, { status: error.status, headers });
    }
    // Do not expose request content or internal details in an error response.
    return Response.json({ error: "evaluation_unavailable" }, { status: 503, headers });
  }
}
