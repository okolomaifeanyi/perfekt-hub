"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getFeedAction } from "@/app/actions/feed";
import { PostProps } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

const POLL_INTERVAL_MS = 15_000;
const POLL_LIMIT = 20;
const INITIAL_LIMIT = 10;

// --- Helpers ---
function normalizeCreatedAt(raw: unknown): Date {
  if (!raw) return new Date(0);
  if (raw instanceof Date) return raw;
  if (raw instanceof Timestamp) return raw.toDate();
  if (typeof raw === "object" && raw && "toDate" in raw)
    return (raw as { toDate: () => Date }).toDate();
  if (typeof raw === "number") return new Date(raw);
  if (typeof raw === "string") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  return new Date(0);
}

function normalizePost(p: Partial<PostProps>): PostProps {
  return {
    ...p,
    id: p.id ?? "",
    userId: p.userId ?? "",
    content: p.content ?? "",
    createdAt: normalizeCreatedAt(p.createdAt),
    engagementScore: p.engagementScore ?? 0,
  } as PostProps;
}

function makeTempId(): string {
  return `temp-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/**
 * Hook: useLiveFeed
 * - Supports polling, realtime updates, and infinite scroll pagination
 * - Now includes mergeAddedPosts()
 * - ✅ Now supports sortMode ("latest" | "trending")
 */
export function useLiveFeed(
  userId: string | null | undefined,
  pageSize = INITIAL_LIMIT,
  parentPostId?: string | null,
  onlyUser = false,
  sortMode: "latest" | "trending" = "latest"
) {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [addedPosts, setAddedPosts] = useState<PostProps[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<PostProps | null>(null);

  const postsRef = useRef<PostProps[]>([]);
  const addedRef = useRef<PostProps[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stateRef = useRef({ loadingMore, hasMore, cursor });
  useEffect(() => {
    stateRef.current = { loadingMore, hasMore, cursor };
  }, [loadingMore, hasMore, cursor]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    addedRef.current = addedPosts;
  }, [addedPosts]);

  // Initial load
  useEffect(() => {
    let active = true;
    setPosts([]);
    setAddedPosts([]);
    setHasMore(true);
    setCursor(null);

    if (!userId) return;

    (async () => {
      try {
        const result = await getFeedAction(
          userId,
          pageSize,
          null, // No cursor for initial load
          parentPostId,
          onlyUser,
          sortMode
        );

        if (!active || !result) return;

        const normalized = result.map(normalizePost);
        setPosts(normalized);

        const last = normalized.at(-1);
        setCursor(last ?? null);
        if (normalized.length < pageSize) setHasMore(false);
      } catch (err) {
        console.error("useLiveFeed initial load error:", err);
      }
    })();

    return () => {
      active = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [userId, pageSize, parentPostId, onlyUser, sortMode]);

  // Polling mode
  useEffect(() => {
    if (!userId) return;
    if (pollingRef.current) clearInterval(pollingRef.current);

    const pollFn = async (): Promise<void> => {
      try {
        const recent = await getFeedAction(
          userId,
          POLL_LIMIT,
          null, // Polling always gets the newest, so no cursor
          null,
          onlyUser,
          sortMode
        );

        const normalized = recent.map(normalizePost);
        const newestLocal = postsRef.current[0]?.createdAt?.getTime() ?? 0;
        const addedIds = new Set(addedRef.current.map(p => p.id));
        const localIds = new Set(postsRef.current.map(p => p.id));

        const fresh = normalized.filter(p => {
          const ts = p.createdAt?.getTime() ?? 0;
          return ts > newestLocal && !localIds.has(p.id) && !addedIds.has(p.id);
        });

        if (fresh.length > 0) {
          setAddedPosts(prev => {
            const existingIds = new Set(prev.map(x => x.id));
            const uniqueNew = fresh.filter(x => !existingIds.has(x.id));
            return [...uniqueNew, ...prev]; // Already sorted by server
          });
        }
      } catch (err) {
        console.debug("Polling feed error:", err);
      }
    };

    pollFn().catch(() => {});
    pollingRef.current = setInterval(pollFn, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [userId, onlyUser, sortMode]);

  // Infinite scroll
  const loadMorePosts = useCallback(async () => {
    const { loadingMore, hasMore, cursor } = stateRef.current;

    if (!userId || loadingMore || !hasMore || !cursor) {
      return;
    }

    setLoadingMore(true);

    try {
      const nextCursor = cursor.createdAt.getTime();

      const result = await getFeedAction(
        userId,
        pageSize,
        nextCursor,
        null,
        onlyUser,
        sortMode
      );

      const normalized = result.map(normalizePost);

      if (normalized.length > 0) {
        setPosts(prev => sortPosts([...prev, ...normalized]));
        const last = normalized.at(-1);
        setCursor(last ?? null);
      }

      if (normalized.length < pageSize) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("loadMorePosts error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, pageSize, onlyUser, sortMode]);

  // ✅ FIX: Correct client-side sorting for merging new posts and optimistic updates
  const sortPosts = useCallback(
    (postsToSort: PostProps[]) => {
      return postsToSort.sort((a, b) => {
        if (sortMode === "trending") {
          const scoreDiff = (b.engagementScore ?? 0) - (a.engagementScore ?? 0);
          if (scoreDiff !== 0) return scoreDiff;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    },
    [sortMode]
  );

  // Merge added posts
  const mergeAddedPosts = useCallback((): void => {
    setPosts(prev => {
      const merged = [...addedRef.current, ...prev];
      const uniqueMap = new Map<string, PostProps>();
      merged.forEach(p => uniqueMap.set(p.id, p));
      return sortPosts(Array.from(uniqueMap.values()));
    });
    setAddedPosts([]);
  }, [sortPosts]);

  // Optimistic helpers
  const addOptimisticPost = useCallback(
    (partial: Partial<PostProps>): string => {
      const tempId = makeTempId();

      const tempPost: PostProps = {
        id: tempId,
        userId: partial.userId ?? "",
        username: partial.username ?? "",
        userPhotoURL: partial.userPhotoURL ?? "",
        userFullName: partial.userFullName ?? "",
        content: partial.content ?? "",
        media: partial.media ?? [],
        parentPostId: partial.parentPostId ?? "",
        quotePostId: partial.quotePostId ?? null,
        replyCount: partial.replyCount ?? 0,
        quoteCount: partial.quoteCount ?? 0,
        createdAt: partial.createdAt || new Date(),
        engagementScore: 0,
        __optimistic: true,
        linkPreview: partial.linkPreview ?? {
          url: "",
          title: "",
          description: "",
          image: "",
        },
      };

      setPosts(prev => sortPosts([tempPost, ...prev]));

      return tempId;
    },
    [sortPosts]
  );

  const replaceOptimisticPost = useCallback(
    (tempId: string, serverPost: PostProps): void => {
      const norm = normalizePost(serverPost);

      setPosts(prev => {
        const filtered = prev.filter(p => p.id !== tempId);
        return sortPosts([norm, ...filtered]);
      });

      setAddedPosts(prev =>
        prev.filter(p => p.id !== tempId && p.id !== norm.id)
      );
    },
    [sortPosts]
  );

  const removeOptimisticPost = useCallback((tempId: string): void => {
    setPosts(prev => prev.filter(p => p.id !== tempId));

    setAddedPosts(prev => prev.filter(p => p.id !== tempId));
  }, []);

  return {
    posts,
    addedPosts,
    hasMore,
    loadingMore,
    addOptimisticPost,
    replaceOptimisticPost,
    removeOptimisticPost,
    mergeAddedPosts,
    loadMorePosts,
    sortMode,
  } as const;
}
