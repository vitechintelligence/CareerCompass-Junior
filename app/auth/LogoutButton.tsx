"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export function LogoutButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setMessage(result.error.message || "Could not sign out. Please try again.");
        return;
      }

      window.location.replace("/auth/sign-in");
    } catch {
      setMessage("Could not sign out. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspaceLogoutControl">
      <button
        className={`workspaceLogoutButton ${className}`.trim()}
        type="button"
        onClick={handleLogout}
        disabled={busy}
        aria-label="Log out of Career Compass Junior"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M10 5H6.75A2.75 2.75 0 0 0 4 7.75v8.5A2.75 2.75 0 0 0 6.75 19H10" />
          <path d="M14 8l4 4-4 4M18 12H9" />
        </svg>
        <span>{busy ? "Logging out…" : "Log out"}</span>
      </button>
      {message && <span className="workspaceLogoutError" role="status">{message}</span>}
    </div>
  );
}
