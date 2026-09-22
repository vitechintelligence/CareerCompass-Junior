import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const VSTJ_TERMS_VERSION = "2026-09-vstj-v1";
export const VSTJ_PRIVACY_VERSION = "2026-09-vstj-privacy-v1";
export const VSTJ_ALLOWED_GRADES = ["11", "12"] as const;

export type JuniorRequestPayload = {
  message: string;
  companyEmail: string;
  contactName: string;
  grades: string[];
  agreement: {
    termsVersion: string;
    privacyVersion: string;
    acceptedAt: string;
    schoolResponsibility: true;
    bridgeOnly: true;
    moderation: true;
    gradesOnly: true;
  };
  invitation?: {
    deliveryStatus: "sent" | "queued" | "failed";
    sentAt?: string;
    lastAttemptAt: string;
  };
};

export type JuniorAdminMeta = {
  vitechReviewNote?: string;
  companyResponse?: {
    status: "accepted" | "declined" | "info_requested";
    note?: string;
    respondedAt: string;
    safeguardsAccepted?: boolean;
  };
  simulation?: {
    title: string;
    overview: string;
    learningObjectives: string;
    tasks: string;
    estimatedMinutes: number;
    safetyNotes?: string;
    allowedGrades: string[];
    status: "submitted" | "approved" | "rejected";
    submittedAt: string;
    reviewedAt?: string;
    moderationNote?: string;
  };
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function parseJuniorRequestPayload(raw: unknown): JuniorRequestPayload | null {
  if (typeof raw !== "string" || !raw.trim().startsWith("{")) return null;
  try {
    const value = asObject(JSON.parse(raw));
    const agreement = asObject(value?.agreement);
    if (!value || typeof value.companyEmail !== "string" || !agreement) return null;
    return value as unknown as JuniorRequestPayload;
  } catch {
    return null;
  }
}

export function parseJuniorAdminMeta(raw: unknown): JuniorAdminMeta {
  if (typeof raw !== "string" || !raw.trim().startsWith("{")) return {};
  try {
    const value = asObject(JSON.parse(raw));
    return value ? value as JuniorAdminMeta : {};
  } catch {
    return {};
  }
}

export function stringifyJuniorRequestPayload(value: JuniorRequestPayload) {
  return JSON.stringify(value);
}

export function stringifyJuniorAdminMeta(value: JuniorAdminMeta) {
  return JSON.stringify(value);
}

function inviteSecret() {
  const secret = process.env.VSTJ_INVITE_SECRET?.trim() || process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("VinaSkillTrust Junior invitation signing is not configured.");
  return secret;
}

function b64url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", inviteSecret()).update(encodedPayload).digest("base64url");
}

export function createJuniorInviteToken(requestId: string, companyEmail: string, ttlHours = 168) {
  const payload = {
    requestId,
    companyEmail: companyEmail.trim().toLowerCase(),
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  };
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyJuniorInviteToken(token: string) {
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expected = sign(encoded);
  const a = Buffer.from(expected);
  const b = Buffer.from(suppliedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      requestId?: string;
      companyEmail?: string;
      exp?: number;
    };
    if (!payload.requestId || !payload.companyEmail || !payload.exp || payload.exp < Date.now()) return null;
    return {
      requestId: payload.requestId,
      companyEmail: payload.companyEmail.toLowerCase(),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

function appUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://career-compass-junior-lake.vercel.app";
  return raw.replace(/\/$/, "");
}

export function juniorInvitationUrl(token: string) {
  return `${appUrl()}/vinaskilltrust-junior/invite/${encodeURIComponent(token)}`;
}

export async function deliverJuniorInvitation(input: {
  requestId: string;
  companyEmail: string;
  contactName?: string;
  companyName: string;
  organizationName: string;
  grades: string[];
  message: string;
}) {
  const token = createJuniorInviteToken(input.requestId, input.companyEmail);
  const url = juniorInvitationUrl(token);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.VSTJ_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return { status: "queued" as const, url };
  }

  const gradeText = input.grades.map((grade) => `Grade ${grade}`).join(" & ");
  const greeting = input.contactName ? `Hello ${input.contactName},` : "Hello,";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.companyEmail],
      subject: `${input.organizationName} invited ${input.companyName} to VinaSkillTrust Junior`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#10233f">
          <p>${greeting}</p>
          <h1 style="font-size:26px">A school would like to connect with your company.</h1>
          <p><strong>${input.organizationName}</strong> is inviting <strong>${input.companyName}</strong> to a monitored, age-appropriate Career Compass Junior connection for <strong>${gradeText}</strong>.</p>
          <p>${input.message || "The school would like students to learn about real roles, skills and work through age-appropriate activities."}</p>
          <p>No student personal data is included in this invitation. Company participation does not create employment, agency, endorsement or partnership with ViTech.</p>
          <p><a href="${url}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0b2748;color:#fff;text-decoration:none;font-weight:700">View & respond</a></p>
          <p style="font-size:12px;color:#66788e">Any proposed simulation remains subject to ViTech moderation before it can be made available to a participating school.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    return { status: "failed" as const, url };
  }
  return { status: "sent" as const, url };
}

export const VSTJ_PARTNER_NOTICE = {
  title: "Grade 11–12 only · VinaSkillTrust Junior",
  bullets: [
    "This feature is limited to Grade 11 and Grade 12 cohorts. Do not use it for younger learners.",
    "The institution is responsible for the company contact details and other information it chooses to disclose, and for any notices or permissions required before sharing identifiable learner information.",
    "ViTech acts as a technology bridge. An introduction does not create an employment, agency, endorsement or partnership relationship between ViTech and the company or institution.",
    "Do not send student personal data in the initial company request. Companies receive only institution, request and collaboration information.",
    "Company simulations must remain age-appropriate and inside the monitored environment. ViTech may reject, pause or remove unsafe, inappropriate, exploitative or privacy-invasive content.",
    "Companies must not request private student contact details, government identifiers, home addresses, financial information, health information or off-platform private communication.",
  ],
} as const;
