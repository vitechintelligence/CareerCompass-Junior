import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { beginnerPublicActivities } from "@/lib/learning/beginner-objectives";

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

  let html: string;
  if (slug === "career-compass-junior") {
    // Readable canonical source preserves the supplied book; compressed original remains archived.
    html = await readFile(path.join(process.cwd(), "content", "interactive-books", "career-compass-junior.html"), "utf8");
    const activities = JSON.stringify(beginnerPublicActivities()).replaceAll("<", "\\u003c");
    html = html.replace("<!-- CCJ_OBJECTIVE_ACTIVITIES -->", `<script id="objective-activities" type="application/json">${activities}</script>`);
  } else {
    const dataDir = path.join(process.cwd(), "public", "interactive-book-data");
    const chunks = await Promise.all(
    Array.from({ length: spec.parts }, async (_, index) => {
      const suffix = String(index + 1).padStart(2, "0");
      return readFile(path.join(dataDir, `${spec.prefix}.b64.${suffix}`), "utf8");
    }),
  );

    html = gunzipSync(Buffer.from(chunks.join("").trim(), "base64")).toString("utf8");
  }

  // The supplied full-book editions were authored with a desktop-first MediaRecorder
  // path. iOS Safari commonly records AAC/MP4 even when book code later labels the
  // replay Blob as audio/webm, which produces the learner-facing "Error" player.
  // Inject this before the book scripts so unsupported recorder options fall back to
  // the browser-native format and audio blobs retain the format actually recorded.
  const mediaRecorderCompat = `
<script>
(function () {
  var NativeRecorder = window.MediaRecorder;
  if (!NativeRecorder) return;

  function SafeMediaRecorder(stream, options) {
    var nextOptions = options;
    if (nextOptions && nextOptions.mimeType && typeof NativeRecorder.isTypeSupported === "function" &&
        !NativeRecorder.isTypeSupported(nextOptions.mimeType)) {
      nextOptions = Object.assign({}, nextOptions);
      delete nextOptions.mimeType;
    }
    try {
      return new NativeRecorder(stream, nextOptions);
    } catch (error) {
      return new NativeRecorder(stream);
    }
  }

  SafeMediaRecorder.prototype = NativeRecorder.prototype;
  try { Object.setPrototypeOf(SafeMediaRecorder, NativeRecorder); } catch (error) {}
  if (typeof NativeRecorder.isTypeSupported === "function") {
    SafeMediaRecorder.isTypeSupported = NativeRecorder.isTypeSupported.bind(NativeRecorder);
  }
  window.MediaRecorder = SafeMediaRecorder;

  var NativeBlob = window.Blob;
  var webmSupported = typeof NativeRecorder.isTypeSupported === "function" &&
    (NativeRecorder.isTypeSupported("audio/webm") || NativeRecorder.isTypeSupported("audio/webm;codecs=opus"));

  if (!webmSupported && NativeBlob) {
    function SafeBlob(parts, options) {
      var nextOptions = options;
      var requestedType = nextOptions && typeof nextOptions.type === "string" ? nextOptions.type : "";
      if (/^audio\\/webm/i.test(requestedType)) {
        var detectedType = "";
        if (parts && typeof parts.length === "number") {
          for (var i = 0; i < parts.length; i += 1) {
            var part = parts[i];
            if (part && typeof part.type === "string" && /^audio\\//i.test(part.type) && !/^audio\\/webm/i.test(part.type)) {
              detectedType = part.type;
              break;
            }
          }
        }
        nextOptions = Object.assign({}, nextOptions || {}, { type: detectedType || "audio/mp4" });
      }
      return new NativeBlob(parts, nextOptions);
    }
    SafeBlob.prototype = NativeBlob.prototype;
    try { Object.setPrototypeOf(SafeBlob, NativeBlob); } catch (error) {}
    window.Blob = SafeBlob;
  }
})();
</script>`;

  const patchedHtml = html.includes("</head>")
    ? html.replace("</head>", `${mediaRecorderCompat}</head>`)
    : `${mediaRecorderCompat}${html}`;

  return new Response(patchedHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Permissions-Policy": "microphone=(self)",
    },
  });
}
