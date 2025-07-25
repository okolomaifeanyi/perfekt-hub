"use client";

import { useState, useTransition } from "react";
import {
  sendFriendRequest,
  checkFriendStatus,
  followUser,
  unfollowUser,
  isFollowing,
} from "@/components/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { unfriendUser } from "@/app/(dashboard)/[username]/[postId]/components/utils";
import { Handshake, UserPlus } from "lucide-react";

interface ConnectDropdownProps {
  currentUid: string;
  targetUid: string;
}

export function ConnectDropdown({
  currentUid,
  targetUid,
}: ConnectDropdownProps) {
  const [status, setStatus] = useState<"none" | "following" | "friends">(
    "none"
  );
  const [pending, startTransition] = useTransition();

  useState(() => {
    const fetchStatus = async () => {
      const [isFriend, isFollow] = await Promise.all([
        checkFriendStatus(currentUid, targetUid),
        isFollowing(currentUid, targetUid),
      ]);
      if (isFriend) setStatus("friends");
      else if (isFollow) setStatus("following");
      else setStatus("none");
    };
    fetchStatus();
  });

  //   const updateStatus = (newStatus: typeof status) => {
  //     startTransition(() => setStatus(newStatus));
  //   };

  const handleAction = async (
    action: "befriend" | "follow" | "unfollow" | "disconnect"
  ) => {
    if (pending) return;

    startTransition(async () => {
      if (action === "befriend") {
        await sendFriendRequest(currentUid, targetUid);
        await followUser(currentUid, targetUid);
        setStatus("friends");
      } else if (action === "follow") {
        await followUser(currentUid, targetUid);
        setStatus("following");
      } else if (action === "unfollow") {
        await unfollowUser(currentUid, targetUid);
        setStatus("none");
      } else if (action === "disconnect") {
        await unfriendUser(currentUid, targetUid);
        await unfollowUser(currentUid, targetUid);
        setStatus("none");
      }
    });
  };

  const label = {
    none: "Connect",
    following: "Following",
    friends: "Connected",
  }[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant={
            label === "Connected"
              ? "default"
              : label === "Following"
              ? "secondary"
              : "outline"
          }
          disabled={pending}
        >
          {pending ? "..." : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "none" && (
          <>
            <DropdownMenuItem onClick={() => handleAction("befriend")}>
              <Button className="w-full" size="sm">
                <Handshake color="black" />
                Befriend
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("follow")}>
              <Button className="w-full" size="sm" variant="secondary">
                <UserPlus /> Follow
              </Button>
            </DropdownMenuItem>
          </>
        )}

        {status === "following" && (
          <>
            <DropdownMenuItem onClick={() => handleAction("unfollow")}>
              Unfollow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("befriend")}>
              Befriend
            </DropdownMenuItem>
          </>
        )}

        {status === "friends" && (
          <>
            <DropdownMenuItem onClick={() => handleAction("disconnect")}>
              Disconnect
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
