"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { VitechMark } from "@/app/VitechMark";
import { authClient } from "@/lib/auth/client";

type Props = {
  mode: "sign-in" | "sign-up";
  callbackUrl: string;
};

type HealthPayload = {
  auth?: {
    configured?: boolean;
    missing?: string[];
    invalid?: string[];
    baseUrlValid?: boolean;
    cookieSecretValid?: boolean;
  };
};

function authSetupMessage(auth: NonNullable<HealthPayload["auth"]>) {
  const missing = auth.missing ?? [];
  const invalid = auth.invalid ?? [];

  if (missing.length > 0) {
    return `Authentication deployment setup is incomplete (${missing.join(", ")}).`;
  }

  if (invalid.includes("NEON_AUTH_COOKIE_SECRET") || auth.cookieSecretValid === false) {
    return "Authentication deployment setup is invalid: NEON_AUTH_COOKIE_SECRET must be a full random secret of at least 32 characters. Update it in Vercel and redeploy.";
  }

  if (invalid.includes("NEON_AUTH_BASE_URL") || auth.baseUrlValid === false) {
    return "Authentication deployment setup is invalid: NEON_AUTH_BASE_URL must be the HTTPS Neon Auth URL for this branch. Update it in Vercel and redeploy.";
  }

  if (invalid.length > 0) {
    return `Authentication deployment setup is invalid (${invalid.join(", ")}).`;
  }

  return "Authentication reached the deployment, but Neon Auth could not complete the request. Check the Neon Auth URL, trusted origin and deployment runtime logs.";
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.3A10.8 10.8 0 0112 4c5.5 0 9.5 5.2 9.5 8a7.7 7.7 0 01-1.7 3.6M6.2 6.2C3.8 7.8 2.5 10.1 2.5 12c0 2.8 4 8 9.5 8a10.8 10.8 0 004.1-.8" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2.5 12c0-2.8 4-8 9.5-8s9.5 5.2 9.5 8-4 8-9.5 8-9.5-5.2-9.5-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function AuthForm({ mode, callbackUrl }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name: name.trim().slice(0, 80) || "Learner",
            email: email.trim().slice(0, 254),
            password,
            callbackURL: callbackUrl,
          })
        : await authClient.signIn.email({
            email: email.trim().slice(0, 254),
            password,
            callbackURL: callbackUrl,
          });

      if (result.error) {
        setMessage(result.error.message || "Authentication failed. Please try again.");
        return;
      }

      window.location.assign(callbackUrl);
    } catch {
      let nextMessage = "Authentication service could not be reached. Please try again in a moment.";

      try {
        const healthResponse = await fetch("/api/health", { cache: "no-store" });
        const health = (await healthResponse.json()) as HealthPayload;
        if (health.auth) nextMessage = authSetupMessage(health.auth);
      } catch {
        // Keep the generic connectivity message when the health endpoint is unavailable too.
      }

      setMessage(nextMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <Link className="brand" href="/">
          <VitechMark />
          <span>Career Compass Junior</span>
        </Link>
        <div className="eyebrow" style={{ marginTop: 30 }}>
          {isSignUp ? "Learner activation" : "Welcome back"}
        </div>
        <h1 className="authTitle">{isSignUp ? "Create your learner access" : "Sign in to continue"}</h1>
        <p className="muted">
          {isSignUp
            ? "Self-registration creates student access only. Teacher and partner permissions are assigned separately."
            : "Your account connects progress, class work and verified learning evidence across the platform."}
        </p>

        <form className="authForm" onSubmit={submit}>
          {isSignUp && (
            <label>
              <span>Name</span>
              <input autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
          )}
          <label>
            <span>Email</span>
            <input autoComplete="email" maxLength={254} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            <span className="authLabelRow">
              <span>Password</span>
              {!isSignUp && (
                <Link href={`/auth/forgot-password?callbackURL=${encodeURIComponent(callbackUrl)}`}>
                  Forgot password?
                </Link>
              )}
            </span>
            <span className="passwordField">
              <input
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={8}
                maxLength={128}
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="passwordToggle"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </span>
          </label>
          <button className="button primary" disabled={busy} type="submit">
            {busy ? "Please wait…" : isSignUp ? "Create student account" : "Sign in"}
          </button>
        </form>

        {message && <p className="activityMessage">{message}</p>}

        <p className="muted authSwitch">
          {isSignUp ? "Already activated? " : "New learner? "}
          <Link href={`${isSignUp ? "/auth/sign-in" : "/auth/sign-up"}?callbackURL=${encodeURIComponent(callbackUrl)}`}>
            {isSignUp ? "Sign in" : "Create student access"}
          </Link>
        </p>
      </section>
    </main>
  );
}
