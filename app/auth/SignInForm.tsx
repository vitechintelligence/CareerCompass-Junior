"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { VitechMark } from "@/app/VitechMark";
import {
  INITIAL_SIGN_IN_STATE,
  signInWithPassword,
  type SignInState,
} from "@/app/auth/actions";

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

export default function SignInForm({
  callbackUrl,
  initialMessage,
}: {
  callbackUrl: string;
  initialMessage?: string | null;
}) {
  const initialState: SignInState = initialMessage
    ? { error: initialMessage }
    : INITIAL_SIGN_IN_STATE;
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="authPage">
      <section className="authCard">
        <Link className="brand" href="/">
          <VitechMark />
          <span>Career Compass Junior</span>
        </Link>

        <div className="eyebrow" style={{ marginTop: 30 }}>Welcome back</div>
        <h1 className="authTitle">Sign in to continue</h1>
        <p className="muted">
          Sign in once and we will route you to your assigned Admin, Partner, Teacher, or Student workspace.
        </p>

        <form className="authForm" action={formAction}>
          <input type="hidden" name="callbackURL" value={callbackUrl} />

          <label>
            <span>Email</span>
            <input
              autoCapitalize="none"
              autoComplete="email"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </label>

          <label>
            <span className="authLabelRow">
              <span>Password</span>
              <Link href={`/auth/forgot-password?callbackURL=${encodeURIComponent(callbackUrl)}`}>
                Forgot password?
              </Link>
            </span>
            <span className="passwordField">
              <input
                autoComplete="current-password"
                maxLength={128}
                minLength={8}
                name="password"
                required
                type={showPassword ? "text" : "password"}
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

          <button className="button primary" disabled={pending} type="submit">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {state.error && <p className="activityMessage" role="alert">{state.error}</p>}

        <div className="authHelpBox">
          <strong>Can’t remember the password?</strong>
          <span>
            Passwords are never emailed or displayed. Use the secure reset link to choose a new one.
          </span>
          <Link href={`/auth/forgot-password?callbackURL=${encodeURIComponent(callbackUrl)}`}>
            Reset password
          </Link>
        </div>

        <p className="muted authSwitch">
          New learner?{" "}
          <Link href={`/auth/sign-up?callbackURL=${encodeURIComponent(callbackUrl)}`}>
            Create student access
          </Link>
        </p>
      </section>
    </main>
  );
}
