import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function privateIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [a, b] = parts;
  return a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0;
}

function privateIpv6(ip: string) {
  const normalized = ip.toLowerCase();
  return normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:");
}

export async function assertSafeExternalHttpsUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    throw new Error("lti_external_url_invalid");
  }
  if (["localhost", "localhost.localdomain"].includes(url.hostname.toLowerCase())) {
    throw new Error("lti_external_url_private");
  }

  if (isIP(url.hostname)) {
    if (privateIpv4(url.hostname) || privateIpv6(url.hostname)) throw new Error("lti_external_url_private");
    return url;
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("lti_external_url_unresolvable");
  for (const address of addresses) {
    if (address.family === 4 && privateIpv4(address.address)) throw new Error("lti_external_url_private");
    if (address.family === 6 && privateIpv6(address.address)) throw new Error("lti_external_url_private");
  }
  return url;
}
