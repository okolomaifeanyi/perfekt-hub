"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui/button";
import { followUser, unfollowUser } from "./utils";

export function FollowButton({
  currentUid,
  targetUid,
  initialFollowing,
}: {
  currentUid: string;
  targetUid: string;
  initialFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  const toggleFollow = async () => {
    startTransition(async () => {
      if (isFollowing) {
        await unfollowUser(currentUid, targetUid);
      } else {
        await followUser(currentUid, targetUid);
      }
      setIsFollowing(!isFollowing);
    });
  };

  return (
    <Button
      onClick={toggleFollow}
      disabled={pending}
      variant={isFollowing ? "destructive" : "default"}
      size="sm"
    >
      {pending ? "..." : isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
}
