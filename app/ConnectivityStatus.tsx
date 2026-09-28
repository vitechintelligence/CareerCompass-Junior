"use client";

import { useEffect, useState } from "react";

export function ConnectivityStatus() {
  const [online, setOnline] = useState(true);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    let timer: number | undefined;

    const onOffline = () => {
      if (timer) window.clearTimeout(timer);
      setReconnected(false);
      setOnline(false);
    };
    const onOnline = () => {
      setOnline(true);
      setReconnected(true);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setReconnected(false), 3500);
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (online && !reconnected) return null;

  return <div
    role="status"
    aria-live="polite"
    style={{
      position:"fixed",left:12,right:12,bottom:12,zIndex:10000,
      padding:"10px 14px",borderRadius:12,background:"#fff",
      border:"1px solid #94a3b8",boxShadow:"0 10px 28px rgba(15,23,42,.16)",
      fontSize:14,fontWeight:600
    }}
  >
    {online
      ? "Connection restored. Retry any item that showed “Save failed.”"
      : "You’re offline. Private learning changes are not marked saved until the server confirms them."}
  </div>;
}
