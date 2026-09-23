"use server";

import { redirect } from "next/navigation";
import { getAuth, getAuthConfigurationStatus } from "@/lib/auth/server";
import { safeInternalPath } from "@/lib/navigation";

export type SignInState = {
  error: string | null;
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

  // Complete the session inside a GET route handler before entering an RSC
  // workspace. This lets Neon Auth persist/refresh its signed session cache
  // in a context where Set-Cookie is legal, which is important on iOS/PWA
  // browsers and avoids a session handoff race after a successful password check.
  redirect(`/auth/session-ready?callbackURL=${encodeURIComponent(callbackURL)}`);
}
