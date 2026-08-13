"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FetchPage<T> = (params: {
  offset: number;
  sortMode: string;
  limit: number;
}) => Promise<T[]>;

/**
 * Generic offset-paginated infinite-scroll list. Offset (not keyset/cursor)
 * pagination on purpose: the sort dimension differs per caller (time vs an
 * aggregate like member/save count), and aggregates don't have a stable
 * unique cursor column to page against — offset is simpler and accurate
 * enough at this scale, at the cost of possible skips/dupes if the
 * underlying data shifts between page loads.
 */
export function useInfiniteList<T>({
  fetchPage,
  sortMode,
  pageSize = 20,
}: {
  fetchPage: FetchPage<T>;
  sortMode: string;
  pageSize?: number;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setItems([]);
    setHasMore(true);
    offsetRef.current = 0;

    fetchPage({ offset: 0, sortMode, limit: pageSize })
      .then(page => {
        if (!active) return;
        setItems(page);
        offsetRef.current = page.length;
        if (page.length < pageSize) setHasMore(false);
      })
      .catch(err => console.error("useInfiniteList initial load failed:", err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode, pageSize]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPage({ offset: offsetRef.current, sortMode, limit: pageSize });
      setItems(prev => [...prev, ...page]);
      offsetRef.current += page.length;
      if (page.length < pageSize) setHasMore(false);
    } catch (err) {
      console.error("useInfiniteList loadMore failed:", err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, sortMode, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return { items, setItems, loading, loadingMore, hasMore, sentinelRef };
}
