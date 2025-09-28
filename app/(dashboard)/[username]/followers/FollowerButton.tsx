"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
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

  if (!currentUser || currentUser.uid === targetId) return null;

  async function toggleFollow() {
    setLoading(true);
    try {
      const followerRef = doc(
        db,
        `users/${targetId}/followers/${currentUser?.uid}`
      );
      const followingRef = doc(
        db,
        `users/${currentUser?.uid}/following/${targetId}`
      );

      if (isFollowing) {
        await Promise.all([deleteDoc(followerRef), deleteDoc(followingRef)]);
      } else {
        await Promise.all([
          setDoc(followerRef, {
            createdAt: serverTimestamp(),
            fromUid: currentUser?.uid,
          }),
          setDoc(followingRef, {
            createdAt: serverTimestamp(),
            toUid: targetId,
          }),
        ]);
      }
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
