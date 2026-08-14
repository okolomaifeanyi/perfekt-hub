"use client";

import { useEffect, useRef } from "react";
import { db, doc, onSnapshot } from "@/lib/supabase";
import { useUserConnections } from "@/hooks/UserConnections";
import { getPresenceStatus } from "@/lib/presence.mjs";
import type { UserProps } from "@/lib/types";

type PresenceStatus = "online" | "recently-active" | "offline";

type AudioContextRef = React.MutableRefObject<AudioContext | null>;

// A friend's doc only changes (and re-fires onSnapshot) when their own
// heartbeat writes to it, so once they stop (tab closed) nothing tells this
// component their status has since decayed to offline — re-checking on an
// interval, not just on snapshot events, means the next time they actually
// come back online gets correctly recognized as a real transition instead
// of silently no-opping because the last-known status never aged down.
const STATUS_RECHECK_INTERVAL_MS = 30_000;

function getAudioContextCtor(): typeof AudioContext | undefined {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

function playChime(ctxRef: AudioContextRef) {
  try {
    if (!ctxRef.current) {
      const Ctor = getAudioContextCtor();
      if (!Ctor) return;
      ctxRef.current = new Ctor();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    // Two quick ascending notes read as a friendly "ping", not an alarm.
    [880, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  } catch (err) {
    console.error("Failed to play friend-online chime:", err);
  }
}

// Plays a short chime whenever a friend transitions from offline to online,
// so the user notices without having to be looking at the Aside sidebar or
// the mobile OnlineFriendsStrip. Mounted once, globally, in ClientLayout —
// both of those display surfaces stay mounted at every viewport width
// (their "mobile-only"/"desktop-only" behavior is CSS visibility, not
// conditional rendering), so attaching this logic to either of them instead
// would risk firing the chime twice for the same transition.
export default function FriendPresenceSound() {
  const { friends } = useUserConnections();
  const profiles = useRef<Record<string, UserProps>>({});
  const previousStatus = useRef<Record<string, PresenceStatus>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Browsers block audio until the page has seen a user gesture. Priming
  // the context on the first click/keypress anywhere (rather than only
  // when a chime is due) means it's usually already unlocked by the time a
  // friend actually comes online, instead of silently failing the first try.
  useEffect(() => {
    const prime = () => {
      if (!audioCtxRef.current) {
        const Ctor = getAudioContextCtor();
        if (Ctor) audioCtxRef.current = new Ctor();
      }
      void audioCtxRef.current?.resume();
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  useEffect(() => {
    if (friends.length === 0) return;

    const checkTransition = (friendId: string) => {
      const profile = profiles.current[friendId];
      if (!profile) return;

      const status = getPresenceStatus(profile) as PresenceStatus;
      const previous = previousStatus.current[friendId];
      previousStatus.current[friendId] = status;

      // Skip the first read per friend (previous === undefined) — that's
      // the initial snapshot, not a real transition. Without this guard,
      // logging in would chime once for every friend already online.
      if (previous === undefined) return;
      if (previous !== "online" && status === "online") {
        playChime(audioCtxRef);
      }
    };

    const unsubs = friends.map(friendId =>
      onSnapshot(doc(db, "users", friendId), snap => {
        profiles.current[friendId] = snap.exists()
          ? ({ uid: snap.id, ...snap.data() } as UserProps)
          : { uid: friendId, username: "" };
        checkTransition(friendId);
      })
    );

    const interval = setInterval(() => {
      friends.forEach(checkTransition);
    }, STATUS_RECHECK_INTERVAL_MS);

    return () => {
      unsubs.forEach(unsub => unsub());
      clearInterval(interval);
    };
  }, [friends]);

  return null;
}
