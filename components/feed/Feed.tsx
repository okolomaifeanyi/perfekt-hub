"use client";

import { P } from "../Typography";
import {
  ScrollPosition,
  trackWindowScroll,
} from "react-lazy-load-image-component";
// import { useUserConnections } from "@/hooks/UserConnections";
import Posts from "./post/Posts";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";

interface FeedProps {
  scrollPosition?: ScrollPosition;
}

const Feed = ({ scrollPosition }: FeedProps) => {
  const {
    posts,
    addedPosts: newPosts,
    mergeAddedPosts,
    hasMore,
    loadingMore,
    loadMorePosts,
  } = useLiveFeed();

  const { ref: loadMoreRef, inView } = useInView({
    triggerOnce: false,
    rootMargin: "600px 0px",
  });

const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    await loadMorePosts();
  }, [loadingMore, hasMore, loadMorePosts]);

  useEffect(() => {
    if (inView) {
      handleLoadMore();
    }
  }, [inView, handleLoadMore]);

  const count = newPosts.length;

  return (
    <div>
      {count > 0 && (
        <div onClick={mergeAddedPosts} className="flex justify-center">
          <P className="!m-0 cursor-pointer">
            Show {count} new post{count > 1 ? "s" : ""}
          </P>
        </div>
      )}

      <Posts
        posts={posts}
        scrollPosition={scrollPosition}
      />

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {!hasMore && <span className="text-sm text-muted">No more posts</span>}
        {loadingMore && <Loader2 className="animate-spin w-4 h-4" />}
      </div>
    </div>
  );
};

export default trackWindowScroll(Feed);
