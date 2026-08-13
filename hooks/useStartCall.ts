"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useUserStore } from "@/lib/store/useUserStore";
import { useActiveCallStore } from "@/lib/store/useActiveCallStore";

// Deterministic per-pair call id so both participants resolve to the same
// call room regardless of who initiates — sorted so uid order doesn't matter.
function directCallId(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join("-");
}

export function useStartCall() {
  const client = useStreamVideoClient();
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
        const call = client.call("default", directCallId(currentUid, targetUid));
        await call.getOrCreate({
          ring: true,
          data: { members: [{ user_id: currentUid }, { user_id: targetUid }] },
        });
        setActiveCall(call);
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
