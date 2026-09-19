"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  locale: "en" | "vi";
  profileScope: string | null;
  enrollmentId: string | null;
};

function storageKey(profileScope: string) {
  return `ccj:${profileScope}:unit1:completed`;
}

function readCompleted(profileScope: string | null) {
  if (!profileScope) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(profileScope)) || "[]") as number[];
    return Array.isArray(parsed)
      ? parsed.filter((value) => Number.isInteger(value) && value >= 1 && value <= 8)
      : [];
  } catch {
    return [];
  }
}

export default function ProgressSyncBridge({ locale, profileScope, enrollmentId }: Props) {
  const syncedRef = useRef<Set<number>>(new Set());
  const [status, setStatus] = useState<"checking" | "synced" | "private">("checking");

  useEffect(() => {
    let cancelled = false;
    let syncing = false;

    if (!profileScope) {
      setStatus("private");
      return () => {
        cancelled = true;
      };
    }

    async function sync() {
      if (syncing || cancelled) return;
      const completed = readCompleted(profileScope);
      const pending = completed.filter((lessonId) => !syncedRef.current.has(lessonId));
      if (pending.length === 0) {
        if (completed.length > 0) setStatus("synced");
        else setStatus("checking");
        return;
      }

      syncing = true;
      try {
        for (const lessonId of pending) {
          const response = await fetch("/api/learning/unit-1/attempt", {
            method: "POST",
            headers: { "content-type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              lessonId,
              completed: true,
              locale,
              enrollmentId: enrollmentId || undefined,
              response: { source: "interactive-unit-1" },
            }),
          });

          if (response.status === 401 || response.status === 403) {
            setStatus("private");
            break;
          }
          if (!response.ok) continue;
          syncedRef.current.add(lessonId);
          setStatus("synced");
        }
      } finally {
        syncing = false;
      }
    }

    void sync();
    const timer = window.setInterval(sync, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [locale, profileScope, enrollmentId]);

  return (
    <div className="syncBadge" role="status" aria-live="polite">
      {status === "synced" && (locale === "vi" ? "☁ Đã đồng bộ vào hồ sơ của em" : "☁ Synced to your profile")}
      {status === "private" && (locale === "vi" ? "Chế độ riêng tư · đăng nhập học sinh để đồng bộ" : "Private preview · sign in as a student to sync")}
      {status === "checking" && (locale === "vi" ? "Đang kiểm tra hồ sơ…" : "Checking your profile…")}
    </div>
  );
}
