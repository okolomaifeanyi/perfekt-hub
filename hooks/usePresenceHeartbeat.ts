"use client";

import { useEffect } from "react";
import { mirrorPresence } from "@/lib/MirrorPresence";

const HEARTBEAT_INTERVAL_MS = 45_000;

// Keeps a signed-in user's lastSeen fresh while they actually have the app
// open and visible — the only signal getPresenceStatus() (lib/presence.mjs)
// uses to decide whether someone shows as online. Without this, nothing in
// the app ever wrote lastSeen/online at all, so every user always read as
// offline no matter what. Mounted once, globally, in ClientLayout.
export function usePresenceHeartbeat(uid: string | null | undefined) {
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;
    const beat = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      void mirrorPresence(uid);
    };

    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", beat);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [uid]);
}
