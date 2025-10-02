"use client";

import { P } from "../Typography";
import {
  ScrollPosition,
  trackWindowScroll,
} from "react-lazy-load-image-component";
import Posts from "./post/Posts";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";
import { useUserStore } from "@/lib/store/useUserStore";

interface FeedProps {
  scrollPosition?: ScrollPosition;
}

const Feed = ({ scrollPosition }: FeedProps) => {
  const currentUser = useUserStore(s => s.user);
  const uid = currentUser?.uid ?? null;

  const {
    posts,
    addedPosts: newPosts,
    mergeAddedPosts,
    hasMore,
    loadingMore,
    loadMorePosts,
  } = useLiveFeed(uid || "");

  const { ref: loadMoreRef, inView } = useInView({
    triggerOnce: false,
    rootMargin: "600px 0px",
  });

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    loadMorePosts();
  }, [loadingMore, hasMore, loadMorePosts]);

  // 🚩 Debounce to avoid rapid calls
  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        handleLoadMore();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [inView, handleLoadMore]);

  const count = newPosts.length;

  // 🚩 Guard: if user not ready
  if (!uid) {
    return (
      <Loader2 className="animate h-4 w-4"/>
    );
  }

  return (
    <div>
      {/* new posts banner */}
      {count > 0 && (
        <div onClick={mergeAddedPosts} className="flex justify-center">
          <P className="!m-0 cursor-pointer">
            Show {count} new post{count > 1 ? "s" : ""}
          </P>
        </div>
      )}

      {/* posts list */}
      <Posts posts={posts} scrollPosition={scrollPosition} />

      {/* bottom state */}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {loadingMore ? (
          <Loader2 className="animate-spin w-4 h-4" />
        ) : !hasMore ? (
          <span className="text-sm text-muted">No more posts</span>
        ) : null}
      </div>
    </div>
  );
};

export default trackWindowScroll(Feed);
