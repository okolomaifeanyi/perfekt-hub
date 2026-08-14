"use client";

import { useEffect, useRef } from "react";
import { db, doc, onSnapshot } from "@/lib/supabase";
import { useUserConnections } from "@/hooks/UserConnections";

type AudioContextRef = React.MutableRefObject<AudioContext | null>;

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
  const previousOnline = useRef<Record<string, boolean>>({});
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

    const unsubs = friends.map(friendId =>
      onSnapshot(doc(db, "users", friendId), snap => {
        const isOnline = snap.exists() ? Boolean(snap.data()?.online) : false;
        const wasOnline = previousOnline.current[friendId];
        previousOnline.current[friendId] = isOnline;

        // Skip the first read per friend (wasOnline === undefined) — that's
        // the initial snapshot, not a real transition. Without this guard,
        // logging in would chime once for every friend already online.
        if (wasOnline === undefined) return;
        if (!wasOnline && isOnline) {
          playChime(audioCtxRef);
        }
      })
    );

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [friends]);

  return null;
}
