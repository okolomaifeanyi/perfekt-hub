"use client";

import { useState, useTransition, useEffect } from "react";
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  checkFriendStatus,
  declineFriendRequest,
} from "@/components/utils";
import { Button } from "@/components/ui/button";
import { unfriendUser } from "@/app/(dashboard)/[username]/[postId]/components/utils";

interface BefriendButtonProps {
  currentUid: string;
  targetUid: string;
}

export function BefriendButton({ currentUid, targetUid }: BefriendButtonProps) {
  const [status, setStatus] = useState<"none" | "requested" | "received" | "friends">("none");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    checkFriendStatus(currentUid, targetUid).then(setStatus);
  }, [currentUid, targetUid]);

  const handleClick = () => {
    if (pending) return;

    startTransition(async () => {
      if (status === "none") {
        await sendFriendRequest(currentUid, targetUid);
        setStatus("requested");
      } else if (status === "requested") {
        await cancelFriendRequest(currentUid, targetUid);
        setStatus("none");
      } else if (status === "received") {
        await acceptFriendRequest(currentUid, targetUid);
        setStatus("friends");
      } else if (status === "friends") {
        await unfriendUser(currentUid, targetUid);
        setStatus("none");
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      await declineFriendRequest(currentUid, targetUid);
      setStatus("none");
    });
  };

  const label = {
    none: "Befriend",
    requested: "Requested",
    received: "Accept Request",
    friends: "Friends",
  }[status];

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleClick} variant="outline" disabled={pending}>
        {pending ? "..." : label}
      </Button>
      {status === "received" && (
        <Button onClick={handleReject} variant="ghost" disabled={pending}>
          Reject
        </Button>
      )}
    </div>
  );
}
