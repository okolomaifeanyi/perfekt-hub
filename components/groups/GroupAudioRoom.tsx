"use client";

import { useEffect, useState } from "react";
import { Mic, Radio } from "lucide-react";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { useStartCall } from "@/hooks/useStartCall";
import { useActiveCallStore } from "@/lib/store/useActiveCallStore";

// A group's audio room is a single always-available call (id derived from
// the group id, created lazily on first join) rather than a ringing call —
// closer to a Twitter/X Space than a phone call. Reuses the same
// ActiveCallBar (mounted globally in ClientLayout) for in-room controls
// once joined, so there's one call UI for both 1:1 calls and group rooms.
export function GroupAudioRoom({ groupId }: { groupId: string }) {
  const client = useStreamVideoClient();
  const { joinGroupAudioRoom, ready } = useStartCall();
  const activeCall = useActiveCallStore(state => state.call);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);

  const isThisRoomActive = activeCall?.id === `group-${groupId}` && activeCall?.type === "audio_room";

  useEffect(() => {
    if (!client || isThisRoomActive) return;
    let active = true;
    client
      .call("audio_room", `group-${groupId}`)
      .get()
      .then(res => {
        if (active) setParticipantCount(res.call.session?.participants.length ?? 0);
      })
      .catch(() => {
        // Room has never been created — nobody's in it yet.
        if (active) setParticipantCount(0);
      });
    return () => {
      active = false;
    };
  }, [client, groupId, isThisRoomActive]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinGroupAudioRoom(groupId);
    } finally {
      setJoining(false);
    }
  };

  if (isThisRoomActive) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-primary/5 px-4 py-3 text-sm">
        <Radio className="size-4 animate-pulse text-primary" />
        <span className="font-medium">You&apos;re in the audio room</span>
        <span className="text-muted-foreground">— controls are in the bar below.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Mic className="size-4 text-muted-foreground" />
        <span className="font-medium">Audio room</span>
        {participantCount !== null && participantCount > 0 && (
          <span className="text-muted-foreground">· {participantCount} listening now</span>
        )}
      </div>
      <Button size="sm" onClick={handleJoin} disabled={!ready || joining}>
        {participantCount && participantCount > 0 ? "Join" : "Start"}
      </Button>
    </div>
  );
}
