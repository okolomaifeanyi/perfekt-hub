"use client";

import { PostProps } from "@/lib/types";
import { useActionState } from "react";
import { useEffect, useState, useCallback, startTransition } from "react";
import { loadMoreUserPosts } from "@/app/actions";
import { useInView } from "react-intersection-observer";
import { List } from "@/components/Typography";
import Post from "@/components/feed/post/Post";

interface UserFeedProps {
  initialUserPosts: PostProps[];
  userId: string;
}

const UserFeed = ({ initialUserPosts, userId }: UserFeedProps) => {
  const [posts, setPosts] = useState<PostProps[]>(initialUserPosts);
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [value, loadMoreAction, pending] = useActionState(
    loadMoreUserPosts,
    null
  );

  const { ref: loadMoreRef, inView } = useInView({
    triggerOnce: false,
    rootMargin: "0px 0px 50px 0px",
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
      formData.append("userId", userId.toString());

      startTransition(() => {
        loadMoreAction(formData);
      });
    }
  }, [page, pending, loading, loadMoreAction, hasMore, userId]);

  useEffect(() => {
    if (inView) {
      loadMoreCallback();
    }
  }, [inView, loadMoreCallback]);

  return (
    <List className="space-y-4 list-none !m-0 !p-0">
      {posts.map(post => (
        <Post key={post.id} post={post} />
      ))}

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {!hasMore && <span className="text-sm text-muted">No more posts</span>}
      </div>
    </List>
  );
};

export default UserFeed;
