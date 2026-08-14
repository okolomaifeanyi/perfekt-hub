"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, PhoneOff, Users } from "lucide-react";
import {
  ParticipantsAudio,
  StreamCall,
  useCall,
  useCallStateHooks,
  CallingState,
} from "@stream-io/video-react-sdk";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActiveCallStore } from "@/lib/store/useActiveCallStore";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import { useCallRingtone } from "@/hooks/useCallRingtone";

function formatDuration(startedAt: Date | undefined) {
  if (!startedAt) return "00:00";
  const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ActiveCallBarInner() {
  const call = useCall();
  const clearActiveCall = useActiveCallStore(state => state.setCall);
  const {
    useCallCallingState,
    useCallCreatedBy,
    useParticipants,
    useRemoteParticipants,
    useMicrophoneState,
    useCallStartedAt,
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const createdBy = useCallCreatedBy();
  const participants = useParticipants();
  const remoteParticipants = useRemoteParticipants();
  const { microphone, isMute } = useMicrophoneState();
  const startedAt = useCallStartedAt();
  const [, forceTick] = useState(0);

  const isOutgoingRinging = callingState === CallingState.RINGING && !!call?.isCreatedByMe;
  // The caller hears nothing while waiting for an answer otherwise — Stream
  // gives you the RINGING state but no sound for it.
  useCallRingtone(isOutgoingRinging);

  // Re-render every second while joined so the duration counter advances —
  // Stream doesn't push a tick event for elapsed time on its own.
  useEffect(() => {
    if (callingState !== CallingState.JOINED) return;
    const interval = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [callingState]);

  useEffect(() => {
    if (!call) return;
    if (callingState === CallingState.LEFT) clearActiveCall(null);
  }, [call, callingState, clearActiveCall]);

  if (!call) return null;
  if (callingState === CallingState.LEFT || callingState === CallingState.IDLE) return null;

  const isGroupRoom = call.type === "audio_room";
  const otherName = createdBy?.name || createdBy?.id || "";

  const handleLeave = async () => {
    try {
      await call.leave();
    } catch (err) {
      console.error("Failed to leave call:", err);
    } finally {
      clearActiveCall(null);
    }
  };

  const label = isOutgoingRinging
    ? `Calling ${otherName}…`
    : callingState === CallingState.JOINING
      ? "Connecting…"
      : isGroupRoom
        ? "Audio room"
        : otherName;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] border-t bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      {/* Nothing else in this app renders Stream's participant views (no
          <SpeakerLayout>, no <ParticipantView> — this is a minimal custom
          bar, not a full call UI), so without this neither side ever
          actually hears the other: audio tracks were being received but
          never attached to a playable <audio> element anywhere. */}
      {callingState === CallingState.JOINED && (
        <ParticipantsAudio participants={remoteParticipants} />
      )}
      <div className="container mx-auto flex items-center gap-3 px-4 py-2.5">
        {isGroupRoom ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-4" />
          </span>
        ) : (
          <Avatar className="size-9 shrink-0">
            <AvatarImage src={createdBy?.image || userAltImageUrl({ name: otherName })} alt="" />
            <AvatarFallback>{(otherName || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {callingState === CallingState.JOINED
              ? `${formatDuration(startedAt)} · ${participants.length} in call`
              : "Ringing…"}
          </p>
        </div>

        {callingState === CallingState.JOINED && (
          <Button
            size="icon"
            variant={isMute ? "secondary" : "outline"}
            className={cn("size-9 shrink-0 rounded-full", !isMute && "text-primary")}
            onClick={() => microphone.toggle()}
            title={isMute ? "Unmute" : "Mute"}
          >
            {isMute ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
        )}

        <Button
          size="icon"
          className="size-9 shrink-0 rounded-full bg-red-600 hover:bg-red-700"
          onClick={handleLeave}
          title={isOutgoingRinging ? "Cancel" : "Leave"}
        >
          <PhoneOff className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function ActiveCallBar() {
  const call = useActiveCallStore(state => state.call);
  if (!call) return null;

  return (
    <StreamCall call={call}>
      <ActiveCallBarInner />
    </StreamCall>
  );
}
