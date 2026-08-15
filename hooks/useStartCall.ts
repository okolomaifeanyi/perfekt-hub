"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useUserStore } from "@/lib/store/useUserStore";
import { useActiveCallStore } from "@/lib/store/useActiveCallStore";
import { useStreamClientStore } from "@/lib/store/useStreamClientStore";
import { notifyIncomingCall } from "@/app/actions/notificationPrefs";

// Deterministic per-pair call id so both participants resolve to the same
// call room regardless of who initiates — sorted so uid order doesn't
// matter. Stream rejects call ids over 64 characters; two Supabase UUIDs
// joined directly are 73, so hash the pair instead of concatenating them.
// A 40-char hex slice of SHA-256 (160 bits) is comfortably collision-free
// for this many possible user pairs while staying well under the limit.
async function directCallId(uidA: string, uidB: string) {
  const pairKey = [uidA, uidB].sort().join("-");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pairKey));
  const hex = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `dm-${hex.slice(0, 40)}`;
}

export function useStartCall() {
  // Reads from a store rather than @stream-io/video-react-sdk's own
  // useStreamVideoClient() — that hook only resolves for descendants of a
  // mounted <StreamVideo> provider, and that provider is a sibling of the
  // app's real content (see StreamVideoProvider), not an ancestor of
  // wherever a call button happens to be. The store has no such
  // tree-position requirement.
  const client = useStreamClientStore(state => state.client);
  const currentUid = useUserStore(state => state.user?.uid);
  const setActiveCall = useActiveCallStore(state => state.setCall);

  // Rings the target user with a 1:1 audio call. The callee sees it via
  // IncomingCallBanner (mounted app-wide) regardless of what page they're
  // on, same as a real phone call.
  const startDirectCall = useCallback(
    async (targetUid: string) => {
      if (!client || !currentUid) {
        toast.error("Calling isn't ready yet — try again in a moment.");
        return;
      }
      if (targetUid === currentUid) return;

      try {
        const call = client.call("default", await directCallId(currentUid, targetUid));
        await call.getOrCreate({
          ring: true,
          // Stream's "default" call type is video-capable by default —
          // video: false only affects what the ring notification says,
          // it doesn't stop the camera from being requested. Explicitly
          // disabling it (below) is what actually keeps this audio-only,
          // confirmed against Stream's docs (Camera & Microphone guide).
          video: false,
          data: { members: [{ user_id: currentUid }, { user_id: targetUid }] },
        });
        // This is meant to be an audio call end to end — without this the
        // caller's own camera light turned on the moment the call was
        // created, confirmed live.
        await call.camera.disable();
        setActiveCall(call);

        // Best-effort — the in-app ring banner already fired via Stream's
        // own realtime call; a failed push just means the receiver relies
        // on that banner alone, same as before this existed.
        notifyIncomingCall(targetUid).catch(err =>
          console.error("notifyIncomingCall failed:", err)
        );
      } catch (err) {
        console.error("startDirectCall failed:", err);
        toast.error(err instanceof Error ? err.message : "Couldn't start the call");
      }
    },
    [client, currentUid, setActiveCall]
  );

  // Group audio room: not a ring — anyone in the group can join an
  // always-available room for that group, created on first join.
  const joinGroupAudioRoom = useCallback(
    async (groupId: string) => {
      if (!client) {
        toast.error("Calling isn't ready yet — try again in a moment.");
        return;
      }

      try {
        const call = client.call("audio_room", `group-${groupId}`);
        await call.join({ create: true });
        // "audio_room" is Stream's built-in type for this kind of room, but
        // isn't guaranteed to default the camera off — disable it
        // explicitly for the same reason as the 1:1 call above.
        await call.camera.disable();
        setActiveCall(call);
      } catch (err) {
        console.error("joinGroupAudioRoom failed:", err);
        toast.error(err instanceof Error ? err.message : "Couldn't join the audio room");
      }
    },
    [client, setActiveCall]
  );

  return { startDirectCall, joinGroupAudioRoom, ready: !!client };
}
