import "server-only";

import {
  createPrivateKey,
  createPublicKey,
  randomUUID,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";
import { assertSafeExternalHttpsUrl } from "@/lib/lti/url-security";

type JwtHeader = { alg?: unknown; kid?: unknown; typ?: unknown };
export type JwtPayload = Record<string, unknown>;

function base64UrlEncode(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buffer.toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url");
}

export function decodeJwt(token: string) {
  if (token.length > 200_000) throw new Error("lti_jwt_too_large");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("lti_jwt_malformed");
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]).toString("utf8")) as JwtHeader;
    const payload = JSON.parse(base64UrlDecode(parts[1]).toString("utf8")) as JwtPayload;
    return {
      header,
      payload,
      signature: base64UrlDecode(parts[2]),
      signingInput: Buffer.from(`${parts[0]}.${parts[1]}`, "utf8"),
    };
  } catch {
    throw new Error("lti_jwt_malformed");
  }
}

function toolPrivateKey() {
  const raw = process.env.LTI_TOOL_PRIVATE_KEY_PEM?.trim();
  if (!raw) throw new Error("lti_tool_private_key_missing");
  const key = createPrivateKey(raw.replace(/\\n/g, "\n"));
  const modulusLength = key.asymmetricKeyDetails?.modulusLength;
  if (key.asymmetricKeyType !== "rsa" || !modulusLength || modulusLength < 2048) {
    throw new Error("lti_tool_private_key_requires_rsa_2048");
  }
  return key;
}

export function ltiToolKeyId() {
  return process.env.LTI_TOOL_KEY_ID?.trim() || "ccj-lti-rs256-1";
}

export function toolJwks() {
  const publicKey = createPublicKey(toolPrivateKey());
  const jwk = publicKey.export({ format: "jwk" }) as Record<string, unknown>;
  return {
    keys: [{
      ...jwk,
      kid: ltiToolKeyId(),
      alg: "RS256",
      use: "sig",
    }],
  };
}

export function signToolJwt(payload: JwtPayload) {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: ltiToolKeyId(),
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, "utf8");
  const signature = cryptoSign("RSA-SHA256", signingInput, toolPrivateKey());
  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`;
}

export function signedClientAssertion(input: {
  clientId: string;
  audience: string;
  lifetimeSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  return signToolJwt({
    iss: input.clientId,
    sub: input.clientId,
    aud: input.audience,
    iat: now,
    exp: now + Math.min(Math.max(input.lifetimeSeconds || 300, 60), 600),
    jti: randomUUID(),
  });
}

export async function verifyPlatformJwtSignature(token: string, jwksUrl: string) {
  const decoded = decodeJwt(token);
  if (decoded.header.alg !== "RS256") throw new Error("lti_jwt_alg_not_supported");
  const kid = typeof decoded.header.kid === "string" ? decoded.header.kid : "";
  if (!kid) throw new Error("lti_jwt_kid_missing");

  const safeUrl = await assertSafeExternalHttpsUrl(jwksUrl);
  const response = await fetch(safeUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error("lti_platform_jwks_unavailable");
  const payload = await response.json() as { keys?: unknown[] };
  const keys = Array.isArray(payload.keys) ? payload.keys : [];
  const jwk = keys.find((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const key = candidate as Record<string, unknown>;
    const alg = String(key.alg || "");
    const use = String(key.use || "");
    return String(key.kid || "") === kid &&
      String(key.kty || "") === "RSA" &&
      (!alg || alg === "RS256") &&
      (!use || use === "sig");
  }) as Record<string, unknown> | undefined;
  if (!jwk) throw new Error("lti_platform_jwk_not_found");

  const publicKey = createPublicKey({ key: jwk as never, format: "jwk" });
  const valid = cryptoVerify("RSA-SHA256", decoded.signingInput, publicKey, decoded.signature);
  if (!valid) throw new Error("lti_jwt_signature_invalid");
  return decoded.payload;
}
