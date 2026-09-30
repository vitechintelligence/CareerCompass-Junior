import { createHash } from "node:crypto";
import { absoluteUrl } from "../site";

const ALLOWED_TARGET_PATHS = new Set(["/api/lti/launch"]);

export function stableHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeExternalId(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function allowedLtiTargetLinkUri(value: string) {
  try {
    const target = new URL(value);
    const canonical = new URL(absoluteUrl("/"));
    return target.origin === canonical.origin && ALLOWED_TARGET_PATHS.has(target.pathname);
  } catch {
    return false;
  }
}

export function safeCareerCompassTargetPath(value: unknown) {
  if (typeof value !== "string") return "/workspace";
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("\0")) return "/workspace";
  const allowed =
    path === "/workspace" ||
    path.startsWith("/learn/") ||
    path.startsWith("/books") ||
    path.startsWith("/steam/");
  return allowed ? path.slice(0, 500) : "/workspace";
}

export function ltiRoleKind(roles: unknown): "teacher" | "student" {
  const list = Array.isArray(roles) ? roles.map(String) : [];
  const instructor = list.some((role) => {
    const normalized = role.toLowerCase();
    return normalized.includes("#instructor") ||
      normalized.includes("#administrator") ||
      normalized.endsWith("/instructor") ||
      normalized.endsWith("/administrator");
  });
  return instructor ? "teacher" : "student";
}

export function audienceAllowsClient(aud: unknown, azp: unknown, clientId: string) {
  const audiences = Array.isArray(aud) ? aud.map(String) : typeof aud === "string" ? [aud] : [];
  if (!audiences.includes(clientId)) return false;
  if (audiences.length > 1 && String(azp || "") !== clientId) return false;
  return true;
}
