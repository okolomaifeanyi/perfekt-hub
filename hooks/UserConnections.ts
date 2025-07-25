"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/useUserStore";

export function useUserConnections() {
  const { user: currentUser } = useUserStore(state => state);
  const [friends, setFriends] = useState<string[] | undefined>([]);
  const [following, setFollowing] = useState<string[] | undefined>([]);
  const [watched, setWatched] = useState<string[] | undefined>([]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const loadConnections = async () => {
      try {
        const res = await fetch(`/api/connections?uid=${currentUser.uid}`);
        const data = await res.json();

        setFriends(data.friends);
        setFollowing(data.following);
        setWatched(data.watched);
      } catch (error) {
        console.error("Failed to load user connections:", error);
      }
    };

    loadConnections();
  }, [currentUser?.uid]);

  return { friends, following, watched };
}
