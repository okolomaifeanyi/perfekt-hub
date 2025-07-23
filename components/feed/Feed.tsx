"use client";

import { PostProps } from "@/lib/types";
import Post from "./post/Post";
import { List } from "../Typography";
import { useActionState } from "react";
import { useEffect, useState, useCallback, startTransition } from "react";
import { loadMore } from "@/app/actions";
import { useInView } from "react-intersection-observer";
import { PostSkeleton } from "./post/PostSkeleton";

interface FeedProps {
  initialPosts: PostProps[];
}

const Feed = ({ initialPosts }: FeedProps) => {
  const [posts, setPosts] = useState<PostProps[]>(initialPosts);

 useEffect(() => {
  setPosts(prev => {
    const existingIds = new Set(prev.map(p => p.id));
    const merged = [...prev];

    initialPosts.forEach(p => {
      if (!existingIds.has(p.id)) merged.push(p);
    });

    return merged;
  });
}, [initialPosts]);

  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [value, loadMoreAction, pending] = useActionState(loadMore, null);

  const { ref: loadMoreRef, inView } = useInView({
    // onChange: (inView, entry) => {
    //   console.log("IN VIEW:", inView);
    //   console.log("ENTRY:", entry);
    // },
    triggerOnce: false,
    rootMargin: "0px 0px 500px 0px",
  });

  // Merge new posts when received
  useEffect(() => {
    // Only process 'value' if it's not null and newPosts property exists
    if (value && typeof value.newPosts !== "undefined") {
      // <-- ADDED NULL CHECK AND newPosts PROPERTY CHECK
      if (value.newPosts.length === 0) {
        setHasMore(false);
        console.log(
          "[CLIENT] No new posts received, setting hasMore to false."
        );
      } else {
        setPosts(prev => [...prev, ...value.newPosts]);
        setPage(value.nextPage);
        console
          .log
          // `[CLIENT] Received ${value.newPosts.length} new posts. New page set to: ${value.nextPage}`
          ();
      }
    }
    setLoading(false);
    // console.log("[CLIENT] Loading set to false after value update.");
  }, [value]);

  // Fetch next page
  const loadMoreCallback = useCallback(() => {
    console.log("[CLIENT] loadMoreCallback called. current page:", page); // ADD THIS
    console.log(
      "[CLIENT] Conditions - pending:",
      pending,
      "loading:",
      loading,
      "hasMore:",
      hasMore
    ); // ADD THIS
    if (!pending && !loading && hasMore) {
      setLoading(true);
      const formData = new FormData();
      formData.append("page", page.toString());
      formData.append("limit", "10");

      console.log(
        `[CLIENT] Calling loadMoreAction for page ${page} with limit 10.`
      );
      startTransition(() => {
        loadMoreAction(formData);
      });
    } else {
      console.log("[CLIENT] loadMoreCallback blocked by conditions.");
    }
  }, [page, pending, loading, loadMoreAction, hasMore]);

  useEffect(() => {
    if (inView) {
      loadMoreCallback();
    }
  }, [inView, loadMoreCallback]);

  console.log("[CLIENT] Rendered Feed component with posts:", posts);

  return (
    <List className="space-y-4 list-none !m-0 !p-0">
      {posts.map(post => (
        <Post key={post.id} post={post} />
      ))}

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {!hasMore ? (
          <span className="text-sm text-muted">No more posts</span>
        ) : loading || pending ? (
          <div className="space-y-4 w-full">
            <PostSkeleton />
          </div>
        ) : (
          <span className="text-sm text-muted">Scroll to load more</span>
        )}
      </div>
    </List>
  );
};

export default Feed;
