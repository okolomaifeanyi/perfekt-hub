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
  const { statuses, loading, fetchStatus, handleAction } = useFriendStore();

  const status = statuses[targetUid] ?? "none";
  const isLoading = loading[targetUid] ?? false;

  const label = {
    none: "Connect",
    following: "Following",
    friends: "Connected",
    requested: "Requested",
    pending: "Pending",
  }[status];

  useEffect(() => {
    fetchStatus(targetUid);
  }, [targetUid, fetchStatus]);

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
            <DropdownMenuItem onClick={() => handleAction(targetUid, "befriend")}>
              <Handshake className="mr-2 h-4 w-4" /> Befriend
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction(targetUid, "follow")}>
              <UserPlus className="mr-2 h-4 w-4" /> Follow
            </DropdownMenuItem>
          </>
        )}

        {/* REQUESTED */}
        {status === "requested" && (
          <>
            <DropdownMenuItem disabled>
              <UserPlus className="mr-2 h-4 w-4" /> Request Sent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction(targetUid, "unfriend")}>
              <UserMinus className="mr-2 h-4 w-4" /> Cancel Request
            </DropdownMenuItem>
          </>
        )}

        {/* PENDING */}
        {status === "pending" && (
          <>
            <DropdownMenuItem onClick={() => handleAction(targetUid, "befriend")}>
              <Handshake className="mr-2 h-4 w-4" /> Accept Request
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction(targetUid, "unfriend")}>
              <UserMinus className="mr-2 h-4 w-4" /> Decline Request
            </DropdownMenuItem>
          </>
        )}

        {/* FOLLOWING */}
        {status === "following" && (
          <>
            <DropdownMenuItem onClick={() => handleAction(targetUid, "unfollow")}>
              <UserMinus className="mr-2 h-4 w-4" /> Unfollow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction(targetUid, "befriend")}>
              <Handshake className="mr-2 h-4 w-4" /> Befriend
            </DropdownMenuItem>
          </>
        )}

        {/* FRIENDS */}
        {status === "friends" && (
          <DropdownMenuItem onClick={() => handleAction(targetUid, "disconnect")}>
            <UserMinus className="mr-2 h-4 w-4" /> Disconnect
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
