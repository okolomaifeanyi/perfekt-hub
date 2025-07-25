"use client";

import { PostProps } from "@/lib/types";
import Post from "./post/Post";
import { List } from "../Typography";
import { useActionState } from "react";
import { useEffect, useState, useCallback, startTransition } from "react";
import { loadMore } from "@/app/actions";
import { useInView } from "react-intersection-observer";

interface FeedProps {
  initialPosts: PostProps[];
}

const Feed = ({ initialPosts }: FeedProps) => {
  const [posts, setPosts] = useState<PostProps[]>(initialPosts);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [value, loadMoreAction, pending] = useActionState(loadMore, null);

  const { ref: loadMoreRef, inView } = useInView({
    triggerOnce: false,
    rootMargin: "0px 0px 500px 0px",
  });

  useEffect(() => {
    if (value && typeof value.newPosts !== "undefined") {
      if (value.newPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts(prev => [...prev, ...value.newPosts]);
        setPage(value.nextPage);
      }
    }
    setLoading(false);
  }, [value]);

  const loadMoreCallback = useCallback(() => {
    if (!pending && !loading && hasMore) {
      setLoading(true);
      const formData = new FormData();
      formData.append("page", page.toString());
      formData.append("limit", "10");

      startTransition(() => {
        loadMoreAction(formData);
      });
    }
  }, [page, pending, loading, loadMoreAction, hasMore]);

  useEffect(() => {
    if (inView) {
      loadMoreCallback();
    }
  }, [inView, loadMoreCallback]);

  return (
    <List className="space-y-4 list-none !m-0 !p-0">
      {posts.map(post => {
        return <Post key={post.id} post={post} />;
      })}

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {!hasMore && <span className="text-sm text-muted">No more posts</span>}
      </div>
    </List>
  );
};

export default Feed;
