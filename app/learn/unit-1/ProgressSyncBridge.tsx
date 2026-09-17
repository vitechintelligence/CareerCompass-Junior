"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  locale: "en" | "vi";
};

const storageKey = "ccj-unit1-completed";

function readCompleted() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as number[];
    return Array.isArray(parsed)
      ? parsed.filter((value) => Number.isInteger(value) && value >= 1 && value <= 8)
      : [];
  } catch {
    return [];
  }
}

export default function ProgressSyncBridge({ locale }: Props) {
  const syncedRef = useRef<Set<number>>(new Set());
  const [status, setStatus] = useState<"checking" | "synced" | "local">("checking");

  useEffect(() => {
    let cancelled = false;
    let syncing = false;
    let anonymous = false;

    async function sync() {
      if (syncing || anonymous || cancelled) return;
      const completed = readCompleted();
      const pending = completed.filter((lessonId) => !syncedRef.current.has(lessonId));
      if (pending.length === 0) {
        if (completed.length > 0) setStatus("synced");
        return;
      }

      syncing = true;
      try {
        for (const lessonId of pending) {
          const response = await fetch("/api/learning/unit-1/attempt", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              lessonId,
              completed: true,
              locale,
              response: { source: "interactive-unit-1" },
            }),
          });

          if (response.status === 401) {
            anonymous = true;
            setStatus("local");
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
    const timer = window.setInterval(sync, 900);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [locale]);

  return (
    <div className="syncBadge" role="status" aria-live="polite">
      {status === "synced" && (locale === "vi" ? "☁ Đã đồng bộ tiến độ" : "☁ Progress synced")}
      {status === "local" && (locale === "vi" ? "Thiết bị này · đăng nhập để đồng bộ" : "On this device · sign in to sync")}
      {status === "checking" && (locale === "vi" ? "Đang kiểm tra đồng bộ…" : "Checking sync…")}
    </div>
  );
}
