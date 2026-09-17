import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const replacements: Array<[string, string]> = [
  [
    '<a class="portal-cta" href="#contact"><span data-vi="Yêu cầu tài khoản học viên" data-en="Ask for student access">',
    '<a class="portal-cta" href="/portal/student"><span data-vi="Yêu cầu tài khoản học viên" data-en="Ask for student access">',
  ],
  [
    '<a class="portal-cta" href="#contact"><span data-vi="Yêu cầu tài khoản giáo viên" data-en="Ask for teacher access">',
    '<a class="portal-cta" href="/workspace/teacher"><span data-vi="Yêu cầu tài khoản giáo viên" data-en="Ask for teacher access">',
  ],
  [
    '<a class="btn primary" href="mailto:Hello@vitechintelligence.com?subject=Career%20Compass%20Junior%20Inquiry" data-vi="Thảo luận hợp tác cùng trung tâm" data-en="Discuss a center partnership">',
    '<a class="btn primary" href="/workspace/partner" data-vi="Thảo luận hợp tác cùng trung tâm" data-en="Discuss a center partnership">',
  ],
];

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "career-compass-junior-landing.html");
  let html = await readFile(filePath, "utf8");

  for (const [from, to] of replacements) html = html.replace(from, to);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
