"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/useUserStore";
import { db } from "@/lib/supabase";
import { collection, onSnapshot } from "@/lib/supabase";

export function useUserConnections() {
  const { user: currentUser } = useUserStore(state => state);
  const [friends, setFriends] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // 🔹 Subscriptions cleanup
    const unsubs: (() => void)[] = [];

    // Friends listener
    const friendsRef = collection(db, "users", currentUser.uid, "friends");
    unsubs.push(
      onSnapshot(friendsRef, snap => {
        setFriends(snap.docs.map(doc => doc.id));
      })
    );

    // Following listener
    const followingRef = collection(db, "users", currentUser.uid, "following");
    unsubs.push(
      onSnapshot(followingRef, snap => {
        setFollowing(snap.docs.map(doc => doc.id));
      })
    );

    // Watched listener
    const watchedRef = collection(db, "users", currentUser.uid, "followers");
    unsubs.push(
      onSnapshot(watchedRef, snap => {
        setFollowers(snap.docs.map(doc => doc.id));
      })
    );

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [currentUser?.uid]);

  return { friends, following, followers };
}
