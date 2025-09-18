"use client";

import { P } from "../Typography";
import {
  ScrollPosition,
  trackWindowScroll,
} from "react-lazy-load-image-component";
import { usePostsLiveFeed } from "@/hooks/PostsLiveFeed";
import { useUserConnections } from "@/hooks/UserConnections";
import Posts from "./post/Posts";
import { useEffect, useCallback, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";

interface FeedProps {
  scrollPosition?: ScrollPosition;
}

const Feed = ({ scrollPosition }: FeedProps) => {
  const { friends, followers } = useUserConnections();
  const {
    newPosts,
    getNewPosts,
    posts,
    loadMorePosts: fetchMoreFromHook,
    hasMore,
  } = usePostsLiveFeed({
    friends: friends || [],
    watched: followers || [],
  });

  const [loading, setLoading] = useState(false);

  const { ref: loadMoreRef, inView } = useInView({
    triggerOnce: false,
    rootMargin: "200px 0px",
  });

  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return; // Guard clauses
    setLoading(true);
    await fetchMoreFromHook(); // Call the function from the hook
    setLoading(false);
  }, [loading, hasMore, fetchMoreFromHook]);

  useEffect(() => {
    if (inView) {
      handleLoadMore();
    }
  }, [inView, handleLoadMore]);

  const count = newPosts.length;

  const handleShowNewPosts = () => {
    getNewPosts();
  };

  return (
    <div>
      {count > 0 && (
        <div onClick={handleShowNewPosts} className="flex justify-center">
          <P className="!m-0 cursor-pointer">
            Show {count} new post{count > 1 ? "s" : ""}
          </P>
        </div>
      )}

     
      <Posts posts={posts} scrollPosition={scrollPosition} />

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {!hasMore && <span className="text-sm text-muted">No more posts</span>}
        {loading && <Loader2 className="animate-spin w-4 h-4" />}
      </div>
    </div>
  );
};

export default trackWindowScroll(Feed);
