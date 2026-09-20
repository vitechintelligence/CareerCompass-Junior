"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { VitechMark } from "@/app/VitechMark";
import { authClient } from "@/lib/auth/client";

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
  value,
  onChange,
  autoComplete,
}: {
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

export function ForgotPasswordForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const redirectUrl = new URL("/auth/reset-password", window.location.origin);
      redirectUrl.searchParams.set("callbackURL", callbackUrl);

      const result = await authClient.requestPasswordReset({
        email: email.trim().slice(0, 254),
        redirectTo: redirectUrl.toString(),
      });

      if (result.error) {
        setMessage("We could not start password recovery right now. Please try again in a moment.");
        return;
      }

      setSent(true);
    } catch {
      setMessage("Password recovery could not reach the authentication service. Please try again.");
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
        <div className="eyebrow" style={{ marginTop: 30 }}>Account recovery</div>
        <h1 className="authTitle">Reset your password</h1>
        <p className="muted">
          Enter the email address connected to your account. We will send a secure password-reset link.
        </p>

        {sent ? (
          <div className="authSuccessBox">
            <strong>Check your email</strong>
            <p>
              If an account exists for that address, a password-reset link has been sent. Check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <form className="authForm" onSubmit={submit}>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <button className="button primary" disabled={busy} type="submit">
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        {message && <p className="activityMessage">{message}</p>}

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
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const invalidLink = !token || Boolean(resetError);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setMessage("The passwords do not match. Please enter the same password in both fields.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setMessage(result.error.message || "This reset link could not be used. Please request a new one.");
        return;
      }

      setComplete(true);
    } catch {
      setMessage("Password reset could not reach the authentication service. Please try again.");
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
        <div className="eyebrow" style={{ marginTop: 30 }}>Secure password reset</div>
        <h1 className="authTitle">{complete ? "Password updated" : "Choose a new password"}</h1>

        {complete ? (
          <>
            <div className="authSuccessBox">
              <strong>Your new password is ready.</strong>
              <p>You can now sign in using the new password.</p>
            </div>
            <div className="actions">
              <Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent(callbackUrl)}`}>
                Sign in
              </Link>
            </div>
          </>
        ) : invalidLink ? (
          <>
            <p className="muted">
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
            <form className="authForm" onSubmit={submit}>
              <label>
                <span>New password</span>
                <PasswordInput autoComplete="new-password" onChange={setPassword} value={password} />
              </label>
              <label>
                <span>Confirm new password</span>
                <PasswordInput autoComplete="new-password" onChange={setConfirmPassword} value={confirmPassword} />
              </label>
              <button className="button primary" disabled={busy} type="submit">
                {busy ? "Updating…" : "Save new password"}
              </button>
            </form>
          </>
        )}

        {message && <p className="activityMessage">{message}</p>}
      </section>
    </main>
  );
}
