import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getCurrentProfile } from "@/lib/auth/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return false;
  return parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0;
}

function privateIp(ip: string) {
  if (isIP(ip) === 4) return privateIpv4(ip);
  const normalized = ip.toLowerCase();
  return isIP(ip) === 6 && (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

async function assertPublicHost(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only public http(s) company websites are supported.");
  if (url.username || url.password) throw new Error("Website credentials are not supported.");
  if (["localhost", "localhost.localdomain"].includes(url.hostname.toLowerCase())) throw new Error("Private hosts are not supported.");

  const results = await lookup(url.hostname, { all: true });
  if (results.length === 0 || results.some((result) => privateIp(result.address))) {
    throw new Error("Private or local network hosts are not supported.");
  }
}

async function fetchPublicHtml(url: URL) {
  await assertPublicHost(url);
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": "VinaSkillTrust-Junior-PublicContact/1.0" },
    signal: AbortSignal.timeout(5000),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) return "";
    const redirected = new URL(location, url);
    await assertPublicHost(redirected);
    if (redirected.hostname !== url.hostname && !redirected.hostname.endsWith(`.${url.hostname}`) && !url.hostname.endsWith(`.${redirected.hostname}`)) return "";
    return fetchPublicHtmlNoRedirect(redirected);
  }
  if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return "";
  return (await response.text()).slice(0, 600_000);
}

async function fetchPublicHtmlNoRedirect(url: URL) {
  const response = await fetch(url, {
    redirect: "error",
    headers: { "User-Agent": "VinaSkillTrust-Junior-PublicContact/1.0" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return "";
  return (await response.text()).slice(0, 600_000);
}

function extractEmails(html: string, hostname: string) {
  const values = new Set<string>();
  for (const match of html.matchAll(/mailto:([^"'?\s<>]+)/gi)) values.add(decodeURIComponent(match[1]).toLowerCase());
  for (const match of html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) values.add(match[0].toLowerCase());

  const hostRoot = hostname.replace(/^www\./, "").split(".").slice(-2).join(".");
  const scored = Array.from(values)
    .filter((email) => !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(email))
    .map((email) => {
      const [local, domain = ""] = email.split("@");
      let score = domain.endsWith(hostRoot) ? 10 : 0;
      if (/^(partnership|partnerships|partner|partners|business|corporate|contact|hello|info|hr|career|careers|recruitment|csr|community)/i.test(local)) score += 8;
      if (/noreply|no-reply|privacy|abuse|webmaster/i.test(local)) score -= 6;
      return { email, score };
    })
    .sort((a, b) => b.score - a.score || a.email.localeCompare(b.email));

  return scored;
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !["partner_admin", "platform_admin"].includes(profile.account_type)) {
    return Response.json({ message: "Partner administrator access required." }, { status: 403 });
  }

  let website = "";
  try {
    const body = await request.json() as { website?: string };
    website = String(body.website || "").trim();
    const base = new URL(website);
    await assertPublicHost(base);

    const candidates = [
      base,
      new URL("/contact", base),
      new URL("/contact-us", base),
      new URL("/lien-he", base),
      new URL("/about", base),
    ];

    const found: Array<{ email: string; score: number; sourceUrl: string }> = [];
    for (const candidate of candidates) {
      try {
        const html = await fetchPublicHtml(candidate);
        for (const item of extractEmails(html, base.hostname).slice(0, 5)) {
          found.push({ ...item, sourceUrl: candidate.toString() });
        }
      } catch {
        // Continue to the next public page.
      }
    }

    found.sort((a, b) => b.score - a.score);
    const best = found[0];
    if (!best) {
      return Response.json({ message: "No public business email was found on the company's official website. Mr. Vi will not guess private or personal email addresses." }, { status: 404 });
    }
    return Response.json({ email: best.email, sourceUrl: best.sourceUrl, message: "Public business contact found. Verify it before sending." });
  } catch {
    return Response.json({ message: website ? "The official website could not be safely scanned. Enter an authorized business email manually." : "Add the company's official website first." }, { status: 400 });
  }
}
