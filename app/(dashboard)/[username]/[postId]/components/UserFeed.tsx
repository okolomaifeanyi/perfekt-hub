"use client";

import { useCallback, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import Posts from "@/components/feed/post/Posts";
import { Loader2 } from "lucide-react";
// import { useParams } from "next/navigation";
import { ScrollPosition } from "react-lazy-load-image-component";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { useUserStore } from "@/lib/store/useUserStore";

interface UserFeedProps {
  scrollPosition?: ScrollPosition;
}

const UserFeed = ({ scrollPosition }: UserFeedProps) => {
  const [loading, setLoading] = useState(false);

  // const { username } = useParams<{
  //   username: string;
  // }>();
  const currentUser = useUserStore(s => s.user);

  const uid = currentUser?.uid

  const {
    posts,
    loadMorePosts: fetchMoreFromHook,
    hasMore,
  } = useLiveFeed(uid, 10, "realtime", "", true);


  // const {
  //   posts,
  //   loadMorePosts: fetchMoreFromHook,
  //   hasMore,
  // } = useUserFeed(username);

  

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

  return (
    <div>
      <Posts posts={posts} scrollPosition={scrollPosition} />

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {!hasMore && <span className="text-sm text-muted">No more posts</span>}
        {loading && <Loader2 className="animate-spin w-4 h-4" />}
      </div>
    </div>
  );
};

export default UserFeed;
