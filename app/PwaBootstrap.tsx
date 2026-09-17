"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaBootstrap() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const appRoute = /^(\/portal|\/workspace|\/learn|\/auth)/.test(window.location.pathname);
    if (!appRoute) return;

    const previouslyDismissed = window.sessionStorage.getItem("ccj-install-dismissed") === "1";
    setDismissed(previouslyDismissed);

    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone || previouslyDismissed) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
    if (isIos && isSafari) {
      const timer = window.setTimeout(() => {
        setShowIosHelp(true);
        setDismissed(false);
      }, 1400);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    window.sessionStorage.setItem("ccj-install-dismissed", "1");
    setDismissed(true);
    setShowIosHelp(false);
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => ({ outcome: "dismissed" as const, platform: "" }));
    setInstallPrompt(null);
    setDismissed(true);
  }

  if (dismissed || (!installPrompt && !showIosHelp)) return null;

  return (
    <aside className="pwaInstallToast" aria-label="Install Career Compass Junior">
      <span className="pwaInstallLogo"><img src="/vitech-logo.svg" alt="" /></span>
      <div className="pwaInstallCopy">
        <strong>Install Career Compass</strong>
        {showIosHelp
          ? <span>On iPhone: tap Share, then “Add to Home Screen”.</span>
          : <span>Add the LMS to your phone for faster portal access.</span>}
      </div>
      {!showIosHelp && <button type="button" className="pwaInstallAction" onClick={install}>Install</button>}
      <button type="button" className="pwaInstallClose" onClick={dismiss} aria-label="Dismiss install prompt">×</button>
    </aside>
  );
}
