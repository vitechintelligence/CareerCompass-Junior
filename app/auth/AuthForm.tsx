"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";

type Props = {
  mode: "sign-in" | "sign-up";
  callbackUrl: string;
};

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
            name: name.trim() || "Learner",
            email: email.trim(),
            password,
            callbackURL: callbackUrl,
          })
        : await authClient.signIn.email({
            email: email.trim(),
            password,
            callbackURL: callbackUrl,
          });

      if (result.error) {
        setMessage(result.error.message || "Authentication failed. Please try again.");
        return;
      }

      window.location.assign(callbackUrl);
    } catch {
      setMessage("Authentication is unavailable on this deployment right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <Link className="brand" href="/">
          <span className="brandMark">CC</span>
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
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
          )}
          <label>
            <span>Email</span>
            <input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
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
