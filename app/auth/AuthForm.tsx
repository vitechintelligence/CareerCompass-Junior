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

export default function AuthForm({ mode, callbackUrl }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            <span>Password</span>
            <input autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} maxLength={128} type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
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
