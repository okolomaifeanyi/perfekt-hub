"use client";

import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Handshake, UserPlus, UserMinus } from "lucide-react";
import { useFriendStore } from "@/lib/store/friendStore";

export default function ConnectDropdown({ targetUid }: { targetUid: string }) {
  const status = useFriendStore(s => s.statuses[targetUid]) ?? "none";
  const isLoading = useFriendStore(s => Boolean(s.loading[targetUid]));
  const handleAction = useFriendStore(state => state.handleAction);
  const fetchStatus = useFriendStore(state => state.fetchStatus);


  const label = {
    none: "Connect",
    following: "Following",
    friends: "Connected",
    pending: "Pending",
    requested: "Requested",
  }[status];

  useEffect(() => {
    console.log("fetchStatus effect fired", targetUid);
    fetchStatus(targetUid);

  }, [fetchStatus, targetUid]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" disabled={isLoading}>
          {isLoading ? "Processing..." : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* NONE */}
        {status === "none" && (
          <>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "befriend")}
            >
              <Handshake className="mr-2 h-4 w-4" /> Befriend
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "follow")}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Follow
            </DropdownMenuItem>
          </>
        )}

        {status === "requested" && (
          <>
            <DropdownMenuItem disabled>
              <UserPlus className="mr-2 h-4 w-4" /> Request Sent
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "cancel")}
            >
              <UserMinus className="mr-2 h-4 w-4" /> Cancel Request
            </DropdownMenuItem>
          </>
        )}

        {/* PENDING (you received) */}
        {status === "pending" && (
          <>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "accept")}
            >
              <Handshake className="mr-2 h-4 w-4" /> Accept Request
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "disconnect")}
            >
              <UserMinus className="mr-2 h-4 w-4" /> Decline Request
            </DropdownMenuItem>
          </>
        )}

        {/* FOLLOWING */}
        {status === "following" && (
          <>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "unfollow")}
            >
              <UserMinus className="mr-2 h-4 w-4" /> Unfollow
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "befriend")}
            >
              <Handshake className="mr-2 h-4 w-4" /> Befriend
            </DropdownMenuItem>
          </>
        )}

        {/* FRIENDS */}
        {status === "friends" && (
          <DropdownMenuItem
            disabled={isLoading}
            onClick={() => handleAction(targetUid, "disconnect")}
          >
            <UserMinus className="mr-2 h-4 w-4" /> Disconnect
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
