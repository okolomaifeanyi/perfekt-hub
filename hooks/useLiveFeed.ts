"use client";

import { db } from "@/lib/firebase";
import { PostProps } from "@/lib/types";
import {
  collection,
  DocumentData,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  getDocs,
  startAfter,
  Unsubscribe,
  QuerySnapshot,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

/**
 * useLiveFeed
 * - pageSize: number of posts per page (top page is realtime)
 *
 * Returns:
 * { posts, addedPosts, mergeAddedPosts, loadMorePosts, loadingMore, hasMore }
 *
 * Behaviour:
 * - Top page (newest `pageSize` posts) is realtime via onSnapshot.
 * - New posts (newer than current newest) show in `addedPosts` (banner) until merged.
 * - Older pages are fetched via getDocs (startAfter). They are static (no realtime).
 */
export function useLiveFeed(pageSize = 10) {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [lastPostRef, setLastPostRef] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [addedPosts, setAddedPosts] = useState<PostProps[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const postRef = collection(db, "posts");

  // refs to avoid stale closures in snapshot callbacks
  const postsRef = useRef<PostProps[]>([]);
  const addedRef = useRef<PostProps[]>([]);
  const unsubRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    addedRef.current = addedPosts;
  }, [addedPosts]);

  // Helper: normalize QueryDocumentSnapshot -> PostProps (defensive)
  const toPost = (doc: QueryDocumentSnapshot<DocumentData>): PostProps => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = doc.data() as any;
    const raw = d.createdAt;
    let createdAt: Date | null = null;

    if (raw?.toDate instanceof Function) {
      createdAt = raw.toDate();
    } else if (raw instanceof Date) {
      createdAt = raw;
    } else if (typeof raw === "string" || typeof raw === "number") {
      const parsed = new Date(raw);
      createdAt = isNaN(parsed.getTime()) ? null : parsed;
    }

    return {
      id: doc.id,
      ...d,
      createdAt,
    } as PostProps;
  };

  // -----------------------
  // Realtime listener for TOP PAGE (only)
  // -----------------------
  useEffect(() => {
    // subscribe to top page (newest posts)
    // use onSnapshot and treat first snapshot as initial load
    const q = query(
      postRef,
      orderBy("createdAt", "desc"),
      limit(Math.max(1, pageSize))
    );

    // cleanup any previous listener
    if (unsubRef.current) {
      try {
        unsubRef.current();
      } catch {
        /* ignore */
      }
      unsubRef.current = null;
    }

    let first = true;
    const unsub = onSnapshot(
      q,
      snapshot => {
        // first snapshot -> set initial page
        if (first) {
          first = false;

          const docs = snapshot.docs.map(toPost);
          setPosts(docs);
          setLastPostRef(snapshot.docs[snapshot.docs.length - 1] ?? null);
          setHasMore(snapshot.docs.length === pageSize);
          return;
        }

        // subsequent snapshots -> process changes
        snapshot.docChanges().forEach(change => {
          const post = toPost(change.doc);

          if (change.type === "added") {
            // skip if already present
            if (
              postsRef.current.some(p => p.id === post.id) ||
              addedRef.current.some(p => p.id === post.id)
            ) {
              return;
            }

            // determine newest timestamp we currently have (0 if none)
            const newest = postsRef.current[0];
            const newestTime = newest?.createdAt
              ? newest.createdAt.getTime()
              : 0;
            const postTime = post.createdAt ? post.createdAt.getTime() : 0;

            // if newer than newest -> banner (addedPosts)
            if (postTime > newestTime) {
              setAddedPosts(prev =>
                prev.some(p => p.id === post.id) ? prev : [post, ...prev]
              );
              return;
            }

            // else: falls inside top-page window -> insert into posts (dedupe)
            setPosts(prev => {
              if (prev.some(p => p.id === post.id)) return prev;
              const merged = [post, ...prev].sort((a, b) => {
                const ta = a.createdAt ? a.createdAt.getTime() : 0;
                const tb = b.createdAt ? b.createdAt.getTime() : 0;
                return tb - ta;
              });
              // keep at most `pageSize` entries for the top realtime window
              return merged.slice(0, pageSize);
            });
            return;
          }

          if (change.type === "modified") {
            setPosts(prev => prev.map(p => (p.id === post.id ? post : p)));
            setAddedPosts(prev => prev.map(p => (p.id === post.id ? post : p)));
            return;
          }

          if (change.type === "removed") {
            setPosts(prev => prev.filter(p => p.id !== post.id));
            setAddedPosts(prev => prev.filter(p => p.id !== post.id));
            return;
          }
        });
      },
      err => {
        console.error("useLiveFeed onSnapshot error:", err);
      }
    );

    unsubRef.current = unsub;

    return () => {
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {
          /* ignore */
        }
        unsubRef.current = null;
      }
    };
    // Re-subscribe if pageSize changes (top window size).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // -----------------------
  // Merge added posts into feed (call from UI)
  // - dedupe by id, preserve descending time order
  // -----------------------
  const mergeAddedPosts = () => {
    const toMerge = addedRef.current.slice(); // newest-first
    if (!toMerge.length) return;

    setPosts(prev => {
      // add new posts (reverse to keep chronological order), then existing
      const map = new Map<string, PostProps>();
      for (const p of toMerge.slice().reverse()) map.set(p.id, p); // oldest-first
      for (const p of prev) map.set(p.id, p);
      const merged = Array.from(map.values()).sort((a, b) => {
        const ta = a.createdAt ? a.createdAt.getTime() : 0;
        const tb = b.createdAt ? b.createdAt.getTime() : 0;
        return tb - ta;
      });
      return merged;
    });

    setAddedPosts([]); // clear banner
  };

  // -----------------------
  // Pagination: load older posts (static fetch).
  // Does NOT expand the realtime listener window.
  // -----------------------
  const loadMorePosts = async () => {
    if (!lastPostRef || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const q = query(
        postRef,
        orderBy("createdAt", "desc"),
        startAfter(lastPostRef),
        limit(pageSize)
      );

      const qs = await getDocs(q) as unknown as QuerySnapshot<DocumentData>;
      const morePosts = qs.docs.map(toPost);

      // append (older posts go at the end)
      setPosts(prev => {
        const map = new Map<string, PostProps>();
        for (const p of prev) map.set(p.id, p);
        for (const p of morePosts) map.set(p.id, p);
        const merged = Array.from(map.values()).sort((a, b) => {
          const ta = a.createdAt ? a.createdAt.getTime() : 0;
          const tb = b.createdAt ? b.createdAt.getTime() : 0;
          return tb - ta;
        });
        return merged;
      });

      setLastPostRef(qs.docs[qs.docs.length - 1] ?? null);
      setHasMore(qs.docs.length === pageSize);
    } catch (err) {
      console.error("useLiveFeed loadMorePosts error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {
          /* ignore */
        }
        unsubRef.current = null;
      }
    };
  }, []);

  return {
    posts,
    addedPosts,
    mergeAddedPosts,
    loadMorePosts,
    loadingMore,
    hasMore,
  };
}
