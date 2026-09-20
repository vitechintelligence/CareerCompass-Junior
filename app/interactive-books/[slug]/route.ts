import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOOK_PARTS: Record<string, { prefix: string; parts: number }> = {
  "my-compass": { prefix: "my-compass", parts: 4 },
  "career-compass-junior": { prefix: "career-compass-junior", parts: 7 },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const spec = BOOK_PARTS[slug];
  if (!spec) return new Response("Interactive book not found.", { status: 404 });

  const dataDir = path.join(process.cwd(), "public", "interactive-book-data");
  const chunks = await Promise.all(
    Array.from({ length: spec.parts }, async (_, index) => {
      const suffix = String(index + 1).padStart(2, "0");
      return readFile(path.join(dataDir, `${spec.prefix}.b64.${suffix}`), "utf8");
    }),
  );

  const html = gunzipSync(Buffer.from(chunks.join("").trim(), "base64")).toString("utf8");

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
