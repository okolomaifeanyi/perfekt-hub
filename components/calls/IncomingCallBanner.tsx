"use client";

import { Phone, PhoneOff } from "lucide-react";
import {
  StreamCall,
  useCall,
  useCalls,
  useCallStateHooks,
  CallingState,
  type Call,
} from "@stream-io/video-react-sdk";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useActiveCallStore } from "@/lib/store/useActiveCallStore";
import { userAltImageUrl } from "@/components/UserAltImageUrl";

function RingingRow() {
  const call = useCall();
  const { useCallCallingState, useCallCreatedBy } = useCallStateHooks();
  const callingState = useCallCallingState();
  const createdBy = useCallCreatedBy();
  const setActiveCall = useActiveCallStore(state => state.setCall);

  if (!call || callingState !== CallingState.RINGING || call.isCreatedByMe) return null;

  const name = createdBy?.name || createdBy?.id || "Someone";

  const handleAccept = async () => {
    try {
      await call.join();
      setActiveCall(call);
    } catch (err) {
      console.error("Failed to accept call:", err);
    }
  };

  const handleDecline = async () => {
    try {
      await call.leave({ reject: true });
    } catch (err) {
      console.error("Failed to decline call:", err);
    }
  };

  return (
    <div className="fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-sm items-center gap-3 rounded-xl border bg-card p-3 shadow-lg sm:inset-x-auto sm:right-4">
      <Avatar className="size-10 shrink-0">
        <AvatarImage src={createdBy?.image || userAltImageUrl({ name })} alt="" />
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">Incoming audio call…</p>
      </div>
      <Button
        size="icon"
        className="size-9 shrink-0 rounded-full bg-red-600 hover:bg-red-700"
        onClick={handleDecline}
        title="Decline"
      >
        <PhoneOff className="size-4" />
      </Button>
      <Button
        size="icon"
        className="size-9 shrink-0 rounded-full bg-green-600 hover:bg-green-700"
        onClick={handleAccept}
        title="Accept"
      >
        <Phone className="size-4" />
      </Button>
    </div>
  );
}

export function IncomingCallBanner() {
  const calls = useCalls();
  // Only ever surfaces calls someone ELSE started that are still ringing —
  // RingingRow re-checks the reactive calling state itself and renders
  // nothing once it changes, this is just an initial filter.
  const incoming = calls.filter(
    (call: Call) => !call.isCreatedByMe && call.state.callingState === CallingState.RINGING
  );

  if (incoming.length === 0) return null;

  return (
    <>
      {incoming.map(call => (
        <StreamCall key={call.cid} call={call}>
          <RingingRow />
        </StreamCall>
      ))}
    </>
  );
}
