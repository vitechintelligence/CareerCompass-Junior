import { EvaluationError } from "./objective-evaluation";

/** Enforce the byte limit even when Content-Length is missing or dishonest. */
export async function readBoundedJson(request: Request, maxBytes = 8192): Promise<unknown> {
  if (!request.headers.get("content-type")?.split(";")[0].trim().toLowerCase().endsWith("/json")) {
    throw new EvaluationError("json_required", 415);
  }
  if (!request.body) throw new EvaluationError("invalid_json", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new EvaluationError("payload_too_large", 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof EvaluationError) throw error;
    throw new EvaluationError("invalid_json", 400);
  } finally {
    reader.releaseLock();
  }
}
