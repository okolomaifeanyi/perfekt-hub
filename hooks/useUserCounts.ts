"use client";

import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

export function useUserCounts(
  uid: string,
  initial?: {
    followers?: number;
    following?: number;
    friends?: number;
    posts?: number;
  }
) {
  const [counts, setCounts] = useState({
    followers: initial?.followers ?? 0,
    following: initial?.following ?? 0,
    friends: initial?.friends ?? 0,
    posts: initial?.posts ?? 0,
  });

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), snap => {
      const d = snap.data() || {};
      setCounts({
        followers: d.followersCount ?? 0,
        following: d.followingCount ?? 0,
        friends: d.friendsCount ?? 0,
        posts: d.postsCount ?? 0,
      });
    });
    return () => unsub();
  }, [uid]);

  return counts;
}
