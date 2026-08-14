"use client";

import { useEffect, useRef } from "react";

function getAudioContextCtor(): typeof AudioContext | undefined {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

// Stream only exposes the RINGING calling state — it doesn't play any
// sound for it. Without this, ringing was entirely silent on both ends:
// the callee had no audible alert (just a small banner easy to miss), and
// the caller heard nothing while waiting for an answer. A classic two-beat
// "brrring-brrring… pause…" pattern, synthesized so it doesn't need an
// audio asset, loops for as long as `ringing` stays true.
export function useCallRingtone(ringing: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ringing) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
    const ctx = audioCtxRef.current;
    void ctx.resume();

    const playRing = () => {
      const now = ctx.currentTime;
      [0, 0.4].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 440;
        const start = now + delay;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
        gain.gain.setValueAtTime(0.15, start + 0.32);
        gain.gain.linearRampToValueAtTime(0, start + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    };

    playRing();
    intervalRef.current = setInterval(playRing, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [ringing]);
}
