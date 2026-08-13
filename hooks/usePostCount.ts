"use client";

import { db } from "@/lib/supabase";
import { doc, onSnapshot } from "@/lib/supabase";
import { useEffect } from "react";
import { usePostCounts } from "@/lib/store/postCounts";
import { useUserStore } from "@/lib/store/useUserStore";

export function useRealtimePostCounts(postId: string) {
  const { setCounts } = usePostCounts();
  const currentUser = useUserStore(state => state.user);

  // 🔴 Post-level counters (aggregates)
  useEffect(() => {
    if (!postId) return;

    const unsub = onSnapshot(doc(db, "posts", postId), snap => {
      const d = snap.data();
      if (!d) return;

      setCounts(postId, {
        likeCount: d.reactionCounts?.like ?? 0,
        dislikeCount: d.reactionCounts?.dislike ?? 0,
        viewCount: d.viewCount ?? 0,
        replyCount: d.replyCount ?? 0,
        quoteCount: d.quoteCount ?? 0,
      });
    });

    return () => unsub();
  }, [postId, setCounts]);

  // 🔵 User-specific engagement (flags)
  useEffect(() => {
    if (!postId || !currentUser?.uid) return;

    const unsub = onSnapshot(
      doc(db, "posts", postId, "engagements", currentUser.uid),
      snap => {
        if (!snap.exists()) return;

        const e = snap.data() as {
          liked?: boolean;
          disliked?: boolean;
          viewed?: boolean;
          replied?: boolean;
          quoted?: boolean;
        };

        setCounts(postId, {
          userReaction: {
            liked: !!e.liked,
            disliked: !!e.disliked,
            viewed: !!e.viewed,
            replied: !!e.replied,
            quoted: !!e.quoted,
          },
        });
      }
    );

    return () => unsub();
  }, [postId, currentUser?.uid, setCounts]);
}
