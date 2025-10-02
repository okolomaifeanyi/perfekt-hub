"use client";

import { useEffect, useRef, useState } from "react";
import { PostProps } from "@/lib/types";
import { getFeedAction } from "@/app/actions/feed";

interface UseLiveFeedResult {
  posts: PostProps[];
  addedPosts: PostProps[];
  mergeAddedPosts: () => void;
  loadMorePosts: () => void;
  loadingMore: boolean;
  hasMore: boolean;
}

/**
 * useLiveFeed
 * - Relies on server actions (getFeedAction) for Firestore queries
 * - Server handles friend/follow logic & chunking
 * - Client only manages state, merging, pagination
 */
export function useLiveFeed(userId: string, pageSize = 10): UseLiveFeedResult {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [addedPosts, setAddedPosts] = useState<PostProps[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null); // timestamp cursor

  const postsRef = useRef<PostProps[]>([]);
  const addedRef = useRef<PostProps[]>([]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    addedRef.current = addedPosts;
  }, [addedPosts]);

  // -----------------------
  // Initial load
  // -----------------------
  useEffect(() => {
    let active = true;
    
    (async () => {
      try {
        const result: PostProps[] = await getFeedAction(userId, pageSize);
        if (!active) return;

        setPosts(result);
        if (result.length < pageSize) {
          setHasMore(false);
        }
        // cursor = oldest post’s createdAt
        const last = result[result.length - 1];
        setCursor(last?.createdAt ? new Date(last.createdAt).getTime() : null);
      } catch (err) {
        console.error("useLiveFeed initial load error:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, pageSize]);

  // -----------------------
  // Merge added posts (banner → main feed)
  // -----------------------
  const mergeAddedPosts = () => {
    const toMerge = addedRef.current.slice();
    if (!toMerge.length) return;

    setPosts(prev => {
      const map = new Map<string, PostProps>();
      for (const p of toMerge.slice().reverse()) map.set(p.id, p);
      for (const p of prev) map.set(p.id, p);

      const merged = Array.from(map.values()).sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      return merged;
    });

    setAddedPosts([]);
  };

  // -----------------------
  // Load more (older posts)
  // -----------------------
  const loadMorePosts = async () => {
    if (!cursor || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const result = await getFeedAction(userId, pageSize, cursor); // 👈 pass cursor
      if (result.length === 0) {
        setHasMore(false);
        return;
      }

      setPosts(prev => {
        const map = new Map<string, PostProps>();
        for (const p of prev) map.set(p.id, p);
        for (const p of result) map.set(p.id, p);

        const merged = Array.from(map.values()).sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        return merged;
      });

      const last = result[result.length - 1];
      setCursor(last?.createdAt ? new Date(last.createdAt).getTime() : null);
      setHasMore(result.length === pageSize);
    } catch (err) {
      console.error("useLiveFeed loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    posts,
    addedPosts,
    mergeAddedPosts,
    loadMorePosts,
    loadingMore,
    hasMore,
  };
}
