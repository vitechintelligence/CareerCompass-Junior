"use client";

import { useEffect, useRef, useState } from "react";
import { practiceStorageKey } from "@/lib/learning/progress-policy";
import { normalizeSubmissionId, unitLessonSubmissionStorageKey } from "@/lib/learning/idempotency";

type Props = {
  locale: "en" | "vi";
  enrollmentId?: string;
  storageNamespace: string;
};

function readCompleted(storageNamespace: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(practiceStorageKey(storageNamespace, "completed")) || "[]") as number[];
    return Array.isArray(parsed)
      ? parsed.filter((value) => Number.isInteger(value) && value >= 1 && value <= 8)
      : [];
  } catch {
    return [];
  }
}

function submissionIdFor(storageNamespace: string, lessonId: number) {
  const key = unitLessonSubmissionStorageKey(storageNamespace, lessonId);
  try {
    const existing = normalizeSubmissionId(window.localStorage.getItem(key));
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export default function ProgressSyncBridge({ locale, enrollmentId, storageNamespace }: Props) {
  const syncedRef = useRef<Set<number>>(new Set());
  const [status, setStatus] = useState<"checking" | "synced" | "local" | "failed">(
    enrollmentId ? "checking" : "local",
  );

  useEffect(() => {
    let cancelled = false;
    let syncing = false;
    let anonymous = false;

    if (!enrollmentId) return () => { cancelled = true; };

    async function sync() {
      if (syncing || anonymous || cancelled) return;
      const completed = readCompleted(storageNamespace);
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
              submissionId: submissionIdFor(storageNamespace, lessonId),
              completed: true,
              enrollmentId,
              locale,
              response: { source: "interactive-unit-1" },
            }),
          });

          if (response.status === 401) {
            anonymous = true;
            setStatus("local");
            break;
          }
          if (!response.ok) { setStatus("failed"); continue; }
          const result = await response.json().catch(() => null);
          if (result?.evaluation?.level !== "SELF_REPORTED") { setStatus("failed"); continue; }
          syncedRef.current.add(lessonId);
          setStatus("synced");
        }
      } catch {
        setStatus("failed");
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
  }, [locale, enrollmentId, storageNamespace]);

  return (
    <div className="syncBadge" role="status" aria-live="polite">
      {status === "synced" && (locale === "vi" ? "☁ Đã đồng bộ tự ghi nhận luyện tập" : "☁ Practice self-report synced")}
      {status === "local" && (locale === "vi" ? "Chỉ trên thiết bị này · đăng nhập để đồng bộ" : "On this device only · sign in to sync")}
      {status === "failed" && (locale === "vi" ? "Lưu thất bại — đang thử lại" : "Save failed — retrying")}
      {status === "checking" && (locale === "vi" ? "Đang kiểm tra đồng bộ…" : "Checking sync…")}
    </div>
  );
}
