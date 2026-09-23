"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, getAuthConfigurationStatus } from "@/lib/auth/server";
import { safeInternalPath } from "@/lib/navigation";
import { SITE_URL } from "@/lib/site";

export type SignInState = {
  error: string | null;
};

export type RecoveryState = {
  status: "idle" | "success" | "error";
  code:
    | "IDLE"
    | "RECOVERY_SENT"
    | "PASSWORD_RESET"
    | "INVALID_EMAIL"
    | "INVALID_PASSWORD"
    | "INVALID_RESET_LINK"
    | "AUTH_NOT_CONFIGURED"
    | "AUTH_ORIGIN_INVALID"
    | "AUTH_RATE_LIMITED"
    | "AUTH_SERVICE_UNAVAILABLE"
    | "AUTH_REQUEST_FAILED";
  message: string | null;
};

type AuthErrorShape = {
  message?: string;
  code?: string;
  status?: number;
  statusText?: string;
};

function friendlySignInError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid") ||
    normalized.includes("credential") ||
    normalized.includes("password") ||
    normalized.includes("user not found") ||
    normalized.includes("incorrect")
  ) {
    return "Email or password not recognized. Check what you entered or use Forgot password to choose a new password.";
  }

  if (normalized.includes("rate") || normalized.includes("too many")) {
    return "Too many sign-in attempts were made. Please wait a moment, then try again.";
  }

  return "Sign-in could not be completed. Please try again or use Forgot password.";
}

function normalizeOrigin(value: string | undefined, allowLocalhost: boolean) {
  if (!value?.trim()) return null;

  let candidate = value.trim();
  if (!candidate.includes("://")) candidate = `https://${candidate}`;

  try {
    const url = new URL(candidate);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (local && !allowLocalhost) return null;
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function resolveAppOrigin() {
  const allowLocalhost = process.env.NODE_ENV !== "production";

  // Production auth redirects must always use the one canonical Career Compass origin.
  // This prevents stale Vercel aliases or environment variables from creating
  // different cookie, PWA, OAuth, or password-recovery states.
  const canonical = normalizeOrigin(SITE_URL, allowLocalhost);
  if (canonical) return canonical;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProto || (allowLocalhost ? "http" : "https");

  return normalizeOrigin(host ? `${protocol}://${host}` : undefined, allowLocalhost);
}

function errorShape(error: unknown): AuthErrorShape {
  if (!error || typeof error !== "object") {
    return { message: error instanceof Error ? error.message : String(error || "") };
  }

  const value = error as Record<string, unknown>;
  return {
    message: typeof value.message === "string" ? value.message : undefined,
    code: typeof value.code === "string" ? value.code : undefined,
    status: typeof value.status === "number" ? value.status : undefined,
    statusText: typeof value.statusText === "string" ? value.statusText : undefined,
  };
}

function logAuthFailure(operation: string, error: unknown) {
  const shaped = errorShape(error);
  console.warn("[career-compass-auth]", {
    operation,
    code: shaped.code || "UNKNOWN",
    status: shaped.status || null,
    statusText: shaped.statusText || null,
  });
}

function classifyRecoveryFailure(error: unknown): RecoveryState {
  const shaped = errorShape(error);
  const normalized = `${shaped.code || ""} ${shaped.message || ""} ${shaped.statusText || ""}`.toLowerCase();

  if (
    shaped.status === 429 ||
    normalized.includes("rate") ||
    normalized.includes("too many")
  ) {
    return {
      status: "error",
      code: "AUTH_RATE_LIMITED",
      message: "Too many recovery attempts were made. Please wait a moment, then try again.",
    };
  }

  if (
    normalized.includes("invalid token") ||
    normalized.includes("invalid_token") ||
    normalized.includes("expired") ||
    normalized.includes("reset token")
  ) {
    return {
      status: "error",
      code: "INVALID_RESET_LINK",
      message: "This password-reset link is invalid or expired. Request a new secure link to continue.",
    };
  }

  if (
    normalized.includes("redirect") ||
    normalized.includes("origin") ||
    normalized.includes("trusted domain") ||
    normalized.includes("trusted_domain")
  ) {
    return {
      status: "error",
      code: "AUTH_ORIGIN_INVALID",
      message: "Account recovery is temporarily unavailable because this app address is not approved by the authentication service.",
    };
  }

  if (
    shaped.status === 502 ||
    shaped.status === 503 ||
    shaped.status === 504 ||
    (typeof shaped.status === "number" && shaped.status >= 500) ||
    normalized.includes("network_") ||
    normalized.includes("fetch failed") ||
    normalized.includes("bad gateway") ||
    normalized.includes("service unavailable")
  ) {
    return {
      status: "error",
      code: "AUTH_SERVICE_UNAVAILABLE",
      message: "The authentication service is temporarily unavailable. Please try again shortly.",
    };
  }

  return {
    status: "error",
    code: "AUTH_REQUEST_FAILED",
    message: "Account recovery could not be completed. Please try again shortly.",
  };
}

function genericRecoverySuccess(): RecoveryState {
  return {
    status: "success",
    code: "RECOVERY_SENT",
    message: "If an account exists for that address, a password-reset link has been sent. Check your inbox and spam folder.",
  };
}

export async function signInWithPassword(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") || "").trim().slice(0, 254);
  const password = String(formData.get("password") || "");
  const callbackURL = safeInternalPath(
    String(formData.get("callbackURL") || "") || undefined,
    "/workspace",
  );

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 8 || password.length > 128) {
    return { error: "Enter the password for this account. Passwords are at least 8 characters." };
  }

  const auth = getAuth();
  if (!auth) {
    const configuration = getAuthConfigurationStatus();
    const details = [...configuration.missing, ...configuration.invalid];
    return {
      error: details.length
        ? `Authentication setup needs attention (${details.join(", ")}).`
        : "Authentication is temporarily unavailable. Please try again shortly.",
    };
  }

  try {
    const result = await auth.signIn.email({ email, password });

    if (result.error) {
      return { error: friendlySignInError(result.error.message || "Authentication failed.") };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { error: friendlySignInError(message) };
  }

  redirect(`/auth/session-ready?callbackURL=${encodeURIComponent(callbackURL)}`);
}

export async function requestPasswordReset(
  _previousState: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const email = String(formData.get("email") || "").trim().slice(0, 254);
  const callbackURL = safeInternalPath(
    String(formData.get("callbackURL") || "") || undefined,
    "/workspace/student",
  );

  if (!email || !email.includes("@")) {
    return {
      status: "error",
      code: "INVALID_EMAIL",
      message: "Enter a valid email address.",
    };
  }

  const auth = getAuth();
  if (!auth) {
    return {
      status: "error",
      code: "AUTH_NOT_CONFIGURED",
      message: "Account recovery is temporarily unavailable. Authentication setup needs attention.",
    };
  }

  const origin = await resolveAppOrigin();
  if (!origin) {
    console.warn("[career-compass-auth]", {
      operation: "request-password-reset",
      code: "APP_ORIGIN_UNRESOLVED",
    });
    return {
      status: "error",
      code: "AUTH_ORIGIN_INVALID",
      message: "Account recovery is temporarily unavailable because the application address is not configured correctly.",
    };
  }

  const redirectUrl = new URL("/auth/reset-password", origin);
  redirectUrl.searchParams.set("callbackURL", callbackURL);

  try {
    const result = await auth.requestPasswordReset({
      email,
      redirectTo: redirectUrl.toString(),
    });

    if (result.error) {
      const shaped = errorShape(result.error);
      const normalized = `${shaped.code || ""} ${shaped.message || ""}`.toLowerCase();

      // Do not reveal whether an email address exists in the auth directory.
      if (
        shaped.status === 404 ||
        normalized.includes("user not found") ||
        normalized.includes("not found") ||
        normalized.includes("does not exist")
      ) {
        return genericRecoverySuccess();
      }

      logAuthFailure("request-password-reset", result.error);
      return classifyRecoveryFailure(result.error);
    }

    return genericRecoverySuccess();
  } catch (error) {
    logAuthFailure("request-password-reset", error);
    return classifyRecoveryFailure(error);
  }
}

export async function resetPasswordWithToken(
  _previousState: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const token = String(formData.get("token") || "").trim().slice(0, 512);
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token) {
    return {
      status: "error",
      code: "INVALID_RESET_LINK",
      message: "This password-reset link is missing, invalid, or expired. Request a new secure link to continue.",
    };
  }

  if (password.length < 8 || password.length > 128) {
    return {
      status: "error",
      code: "INVALID_PASSWORD",
      message: "Use a password between 8 and 128 characters.",
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      code: "INVALID_PASSWORD",
      message: "The passwords do not match. Enter the same password in both fields.",
    };
  }

  const auth = getAuth();
  if (!auth) {
    return {
      status: "error",
      code: "AUTH_NOT_CONFIGURED",
      message: "Password reset is temporarily unavailable. Authentication setup needs attention.",
    };
  }

  try {
    const result = await auth.resetPassword({
      newPassword: password,
      token,
    });

    if (result.error) {
      logAuthFailure("reset-password", result.error);
      return classifyRecoveryFailure(result.error);
    }

    return {
      status: "success",
      code: "PASSWORD_RESET",
      message: "Your password has been updated. You can now sign in with the new password.",
    };
  } catch (error) {
    logAuthFailure("reset-password", error);
    return classifyRecoveryFailure(error);
  }
}
