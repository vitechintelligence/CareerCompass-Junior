"use client";

import { useCallback, useRef } from "react";

const routes: Record<string, string> = {
  "Ask for student access": "/portal/student",
  "Ask for teacher access": "/portal/teacher",
  "Discuss a center partnership": "/portal/partner",
};

export default function Home() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const connectLandingToApp = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;

    for (const [englishLabel, href] of Object.entries(routes)) {
      const candidates = Array.from(doc.querySelectorAll<HTMLElement>(`[data-en="${englishLabel}"]`));
      for (const candidate of candidates) {
        const anchor = candidate.closest("a") ?? (candidate instanceof HTMLAnchorElement ? candidate : null);
        if (!anchor) continue;
        anchor.setAttribute("href", href);
        anchor.setAttribute("target", "_top");
        anchor.setAttribute("data-app-route", "true");
      }
    }

    // The collection section in the static landing remains visually untouched;
    // this adds a real app destination when a visitor chooses to explore books.
    for (const candidate of Array.from(doc.querySelectorAll<HTMLElement>('[data-en="Explore the learning library"]'))) {
      const anchor = candidate.closest("a");
      if (anchor) anchor.setAttribute("data-book-collection", "/books");
    }
  }, []);

  return (
    <iframe
      ref={frameRef}
      src="/landing.html?v=20260923-stable-library-portals-v1"
      title="Career Compass Junior"
      onLoad={connectLandingToApp}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", border: 0, background: "white" }}
    />
  );
}
