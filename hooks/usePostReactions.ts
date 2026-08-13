"use client";

import { useEffect } from "react";
import { db } from "@/lib/supabase";
import { doc, onSnapshot } from "@/lib/supabase";
import { usePostCounts } from "@/lib/store/postCounts";

export function usePostReactions(postId: string, userId?: string) {
  const { setCounts } = usePostCounts();

  useEffect(() => {
    if (!postId) return;

    // 🔥 Listen for post root counts
    const postRef = doc(db, "posts", postId);
    const unsubPost = onSnapshot(postRef, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setCounts(postId, {
        likeCount: data.reactionCounts?.like ?? 0,
        dislikeCount: data.reactionCounts?.dislike ?? 0,
        replyCount: data.replyCount ?? 0,
        quoteCount: data.quoteCount ?? 0,
        viewCount: data.viewCount ?? 0,
      });
    });

    // 🔥 Listen for this user's engagement
    let unsubUser: (() => void) | undefined;
    if (userId) {
      const engagementRef = doc(db, `posts/${postId}/engagements/${userId}`);
      unsubUser = onSnapshot(engagementRef, snap => {
        const e = snap.exists() ? snap.data() : {};
        setCounts(postId, {
          userReaction: {
            liked: e?.liked || false,
            disliked: e?.disliked || false,
            viewed: e?.viewed || false,
            quoted: e?.quoted || false,
            replied: e?.replied || false,
          },
        });
      });
    }

    return () => {
      unsubPost();
      if (unsubUser) unsubUser();
    };
  }, [postId, userId, setCounts]);
}
