import { readFile } from "node:fs/promises";
import path from "node:path";
import { beginnerPublicActivities } from "@/lib/learning/beginner-objectives";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOOK_SLUGS = new Set(["my-compass", "career-compass-junior"]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const requestUrl = new URL(request.url);
  const requestedScope = requestUrl.searchParams.get("scope") || "";
  const enrollmentScope = UUID_RE.test(requestedScope) ? requestedScope : "";
  if (!BOOK_SLUGS.has(slug)) return new Response("Interactive book not found.", { status: 404 });

  let html: string;
  if (slug === "career-compass-junior") {
    // Readable canonical source preserves the supplied book; compressed original remains archived.
    html = await readFile(path.join(process.cwd(), "content", "interactive-books", "career-compass-junior.html"), "utf8");
    const activities = JSON.stringify(beginnerPublicActivities()).replaceAll("<", "\\u003c");
    html = html.replace("<!-- CCJ_OBJECTIVE_ACTIVITIES -->", `<script id="objective-activities" type="application/json">${activities}</script>`);
  } else {
    // The original compressed book remains archived under public/interactive-book-data.
    html = await readFile(path.join(process.cwd(), "content", "interactive-books", "my-compass.html"), "utf8");
  }

  const storageNamespace = `
<script>
(function () {
  var assignedScope = ${JSON.stringify(enrollmentScope)};
  var scope = assignedScope;
  if (!scope) {
    try {
      scope = sessionStorage.getItem("ccj_guest_scope") || "";
      if (!scope) {
        scope = "guest-" + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
        sessionStorage.setItem("ccj_guest_scope", scope);
      }
    } catch (error) {
      scope = "guest-session";
    }
  }
  window.__CCJ_STORAGE_SCOPE__ = scope;
})();
</script>`;

  if (slug === "career-compass-junior") {
    html = html.replace(
      "const STORE_KEY = 'ccjunior_v1';",
      "const STORE_KEY = 'ccjunior_v1:' + String(window.__CCJ_STORAGE_SCOPE__ || 'guest-session');",
    );
  } else {
    html = html.replace(
      "const STORE_KEY = 'mycompass_progress_v1';",
      "const STORE_KEY = 'mycompass_progress_v1:' + String(window.__CCJ_STORAGE_SCOPE__ || 'guest-session');",
    );
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

  const injectedRuntime = `${storageNamespace}${mediaRecorderCompat}`;
  const patchedHtml = html.includes("</head>")
    ? html.replace("</head>", `${injectedRuntime}</head>`)
    : `${injectedRuntime}${html}`;

  return new Response(patchedHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Permissions-Policy": "microphone=(self)",
    },
  });
}
