"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { VitechMark } from "@/app/VitechMark";
import {
  requestPasswordReset,
  resetPasswordWithToken,
  type RecoveryState,
} from "@/app/auth/actions";

const INITIAL_RECOVERY_STATE: RecoveryState = {
  status: "idle",
  code: "IDLE",
  message: null,
};

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

function PasswordInput({
  name,
  value,
  onChange,
  autoComplete,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="passwordField">
      <input
        autoComplete={autoComplete}
        maxLength={128}
        minLength={8}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        required
        type={visible ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="passwordToggle"
        onClick={() => setVisible((value) => !value)}
        type="button"
      >
        <EyeIcon hidden={visible} />
      </button>
    </span>
  );
}

function RecoveryMessage({ state }: { state: RecoveryState }) {
  if (!state.message || state.status === "idle") return null;

  if (state.status === "success") {
    return (
      <div className="authSuccessBox" role="status">
        <strong>{state.code === "PASSWORD_RESET" ? "Password updated" : "Check your email"}</strong>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <p className="activityMessage" role="alert" data-auth-code={state.code}>
      {state.message}
    </p>
  );
}

export function ForgotPasswordForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    INITIAL_RECOVERY_STATE,
  );
  const sent = state.status === "success" && state.code === "RECOVERY_SENT";

  return (
    <main className="authPage">
      <section className="authCard">
        <Link className="brand" href="/">
          <VitechMark />
          <span>Career Compass Junior</span>
        </Link>
        <div className="eyebrow" style={{ marginTop: 30 }}>Account recovery</div>
        <h1 className="authTitle">Reset your password</h1>
        <p className="muted">
          Enter the email address connected to your account. We will send a secure password-reset link.
        </p>

        {sent ? (
          <RecoveryMessage state={state} />
        ) : (
          <>
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
              <button className="button primary" disabled={pending} type="submit">
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <RecoveryMessage state={state} />
          </>
        )}

        <p className="muted authSwitch">
          Remembered your password?{" "}
          <Link href={`/auth/sign-in?callbackURL=${encodeURIComponent(callbackUrl)}`}>Return to sign in</Link>
        </p>
      </section>
    </main>
  );
}

export function ResetPasswordForm({
  callbackUrl,
  token,
  resetError,
}: {
  callbackUrl: string;
  token: string | null;
  resetError: string | null;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, formAction, pending] = useActionState(
    resetPasswordWithToken,
    INITIAL_RECOVERY_STATE,
  );

  const invalidLink = !token || Boolean(resetError);
  const complete = state.status === "success" && state.code === "PASSWORD_RESET";

  return (
    <main className="authPage">
      <section className="authCard">
        <Link className="brand" href="/">
          <VitechMark />
          <span>Career Compass Junior</span>
        </Link>
        <div className="eyebrow" style={{ marginTop: 30 }}>Secure password reset</div>
        <h1 className="authTitle">{complete ? "Password updated" : "Choose a new password"}</h1>

        {complete ? (
          <>
            <RecoveryMessage state={state} />
            <div className="actions">
              <Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent(callbackUrl)}`}>
                Sign in
              </Link>
            </div>
          </>
        ) : invalidLink ? (
          <>
            <p className="muted" role="alert">
              This password-reset link is missing, invalid, or expired. Request a new secure link to continue.
            </p>
            <div className="actions">
              <Link className="button primary" href={`/auth/forgot-password?callbackURL=${encodeURIComponent(callbackUrl)}`}>
                Request another link
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="muted">Use at least 8 characters. You can use the eye icon to check what you typed before saving.</p>
            <form className="authForm" action={formAction}>
              <input type="hidden" name="token" value={token || ""} />
              <label>
                <span>New password</span>
                <PasswordInput
                  autoComplete="new-password"
                  name="password"
                  onChange={setPassword}
                  value={password}
                />
              </label>
              <label>
                <span>Confirm new password</span>
                <PasswordInput
                  autoComplete="new-password"
                  name="confirmPassword"
                  onChange={setConfirmPassword}
                  value={confirmPassword}
                />
              </label>
              <button className="button primary" disabled={pending} type="submit">
                {pending ? "Updating…" : "Save new password"}
              </button>
            </form>
            <RecoveryMessage state={state} />
          </>
        )}
      </section>
    </main>
  );
}
