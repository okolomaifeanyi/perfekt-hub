"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSupabaseToken } from "@/lib/utils";
import { useUserStore } from "@/lib/store/useUserStore";


export default function FollowButton({
  targetId,
  isFollowing,
}: {
  targetId: string;
  isFollowing: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const currentUser = useUserStore(state => state.user);
  const bumpFeedRefreshSignal = useUserStore(state => state.bumpFeedRefreshSignal);

  if (!currentUser || currentUser.uid === targetId) return null;

  async function toggleFollow() {
    setLoading(true);
    try {
      // Route through the same follow/unfollow API the Connect dropdown
      // uses — it's what actually updates followersCount/followingCount and
      // refreshes the target's cached feed author list. The previous direct
      // Firestore-shim writes here skipped both.
      const action = isFollowing ? "unfollow" : "follow";
      const res = await fetch(`/api/friends/${targetId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await getSupabaseToken()}` },
      });

      if (!res.ok) throw new Error(`Failed to ${action}`);

      if (action === "follow") bumpFeedRefreshSignal();
    } catch (err) {
      console.error("toggleFollow:", err);
      toast.error(
        isFollowing ? "Failed to unfollow" : "Failed to follow"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      disabled={loading}
      onClick={toggleFollow}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
