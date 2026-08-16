"use client";

import { useEffect, useState } from "react";
import {
  getCuratedContentReactions,
  toggleCuratedContentReaction,
  type CuratedContentReactionSummary,
  type ReactionType,
} from "@/app/actions/curatedContentReactions";
import { useUserStore } from "@/lib/store/useUserStore";
import { toast } from "sonner";

const EMPTY_SUMMARY: CuratedContentReactionSummary = {
  likeCount: 0,
  dislikeCount: 0,
  userReaction: null,
};

// One batched fetch per list of visible rows (a /updates tab or a Discover
// topic tab renders many cards at once) instead of each row fetching its
// own reactions — see getCuratedContentReactions for why this is a plain
// batched query rather than a per-row round trip.
export function useCuratedContentReactions(contentIds: string[]) {
  const currentUser = useUserStore(state => state.user);
  const [reactions, setReactions] = useState<Record<string, CuratedContentReactionSummary>>({});
  const idsKey = contentIds.join(",");

  useEffect(() => {
    if (!idsKey) return;
    let active = true;
    getCuratedContentReactions(contentIds)
      .then(result => {
        if (active) setReactions(result);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const toggle = async (contentId: string, type: ReactionType) => {
    if (!currentUser) {
      toast.error("Sign in to react");
      return;
    }

    const previous = reactions[contentId] ?? EMPTY_SUMMARY;
    const isRemoving = previous.userReaction === type;

    // Optimistic — mirrors the same increment/decrement/switch logic the
    // server applies, so the count doesn't visibly jump once the real
    // response lands a moment later.
    const optimistic: CuratedContentReactionSummary = {
      likeCount:
        previous.likeCount +
        (type === "like" ? (isRemoving ? -1 : 1) : previous.userReaction === "like" ? -1 : 0),
      dislikeCount:
        previous.dislikeCount +
        (type === "dislike" ? (isRemoving ? -1 : 1) : previous.userReaction === "dislike" ? -1 : 0),
      userReaction: isRemoving ? null : type,
    };
    setReactions(prev => ({ ...prev, [contentId]: optimistic }));

    try {
      const summary = await toggleCuratedContentReaction(contentId, type);
      setReactions(prev => ({ ...prev, [contentId]: summary }));
    } catch (err) {
      setReactions(prev => ({ ...prev, [contentId]: previous }));
      toast.error(err instanceof Error ? err.message : "Failed to react");
    }
  };

  return {
    getReaction: (contentId: string) => reactions[contentId] ?? EMPTY_SUMMARY,
    toggle,
  };
}
