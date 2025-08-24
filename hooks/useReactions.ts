"use client";

import { useEffect, useState, useTransition } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface ReactionCounts {
  like?: number;
  dislike?: number;
}

export function usePostReactions(postId: string, userId: string) {
  const [counts, setCounts] = useState<ReactionCounts>({
    like: 0,
    dislike: 0,
  });
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!postId) return;

    // 🔥 Listen for live reaction counts
    const postRef = doc(db, "posts", postId);
    const unsubPost = onSnapshot(postRef, snap => {
      if (snap.exists()) {
        setCounts(snap.data().reactionCounts || {});
      }
    });

    // 🔥 Listen for this user's reaction
    let unsubUser: (() => void) | undefined;
    if (userId) {
      const userReactionRef = doc(db, `posts/${postId}/reactions/${userId}`);
      unsubUser = onSnapshot(userReactionRef, snap => {
        if (snap.exists()) {
          setUserReaction(snap.data().type);
        } else {
          setUserReaction(null);
        }
        setLoading(false);
      });
    }

    return () => {
      unsubPost();
      if (unsubUser) unsubUser();
    };
  }, [postId, userId]);

  // 🔑 API call to toggle like/dislike
  const toggleReaction = (type: "like" | "dislike") => {
    if (!userId) return;
    startTransition(async () => {
      await fetch("/api/reactions/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId, type }),
      });
    });
  };

  return { counts, userReaction, loading, isPending, toggleReaction };
}
