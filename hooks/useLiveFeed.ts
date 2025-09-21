"use client";

import { db } from "@/lib/firebase";
import { PostProps } from "@/lib/types";
import {
  collection,
  DocumentData,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  Unsubscribe,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

/**
 * useLiveFeed
 * - pageSize: number of posts per page
 *
 * Returns:
 * { posts, addedPosts, mergeAddedPosts, loadMorePosts, loadingMore, hasMore }
 */
export function useLiveFeed(pageSize = 10) {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [lastPostRef, setLastPostRef] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [addedPosts, setAddedPosts] = useState<PostProps[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const postRef = collection(db, "posts");

  // how many top posts the realtime listener should watch (starts at initial pageSize)
  const [listenerLimit, setListenerLimit] = useState<number>(pageSize);

  // refs for stable closures and cleanup
  const postsRef = useRef<PostProps[]>([]);
  const addedRef = useRef<PostProps[]>([]);
  const unsubRef = useRef<Unsubscribe | null>(null);
  const initialLoadedRef = useRef(false);
  const mountedRef = useRef(true);

  // keep refs up-to-date
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);
  useEffect(() => {
    addedRef.current = addedPosts;
  }, [addedPosts]);

  // --- helpers ---

  // Normalize Firestore doc -> PostProps (defensive)
  const toPost = (doc: QueryDocumentSnapshot<DocumentData> | DocumentData): PostProps => {
    const d = doc.data?.() ?? doc; // if doc is snapshot or raw object
    const createdAtRaw = d.createdAt;
    let createdAt: Date | null = null;

    if (createdAtRaw?.toDate) {
      // Firestore Timestamp
      createdAt = createdAtRaw.toDate();
    } else if (createdAtRaw instanceof Date) {
      createdAt = createdAtRaw;
    } else if (
      typeof createdAtRaw === "number" ||
      typeof createdAtRaw === "string"
    ) {
      const parsed = new Date(createdAtRaw);
      createdAt = isNaN(parsed.getTime()) ? null : parsed;
    }

    return {
      id: doc.id ?? d.id ?? "",
      ...d,
      createdAt,
    } as PostProps;
  };

  // Insert or replace post, keep array sorted desc by createdAt, cap optional
//   const upsertAndSortDesc = (
//     arr: PostProps[],
//     post: PostProps,
//     cap?: number
//   ) => {
//     const map = new Map<string, PostProps>();
//     for (const p of arr) map.set(p.id, p);
//     map.set(post.id, post);
//     const merged = Array.from(map.values()).sort((a, b) => {
//       const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
//       const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
//       return tb - ta;
//     });
//     return typeof cap === "number" ? merged.slice(0, cap) : merged;
//   };

  // --- initial load (one-time getDocs) ---
  useEffect(() => {
    mountedRef.current = true;
    async function loadInitial() {
      const q = query(postRef, orderBy("createdAt", "desc"), limit(pageSize));
      const qs = await getDocs(q);

      if (!mountedRef.current) return;

      const newPosts = qs.docs.map(toPost);
      setPosts(newPosts);
      setLastPostRef(qs.docs[qs.docs.length - 1] ?? null);
      setHasMore(qs.docs.length === pageSize);
      setListenerLimit(newPosts.length); // start listener watching the same window
      initialLoadedRef.current = true;
    }

    loadInitial();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // --- single managed listener watching top `listenerLimit` posts ---
  useEffect(() => {
    // don't attach until initial load finished
    if (!initialLoadedRef.current) return;

    // cleanup previous listener if any
    if (unsubRef.current) {
      try {
        unsubRef.current();
      } catch {
        // ignore
      }
      unsubRef.current = null;
    }

    const q = query(
      postRef,
      orderBy("createdAt", "desc"),
      limit(listenerLimit)
    );
    let isFirstSnapshot = true;

    const unsub = onSnapshot(
      q,
      snapshot => {
        // ignore the first snapshot from onSnapshot because we already set initial posts via getDocs
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          return;
        }

        // process changes
        snapshot.docChanges().forEach(change => {
          const post = toPost(change.doc);

          if (change.type === "added") {
            // If newer than current newest -> treat as "addedPosts" (banner)
            const newest = postsRef.current[0];
            const newestTime = newest?.createdAt
              ? new Date(newest.createdAt).getTime()
              : 0;
            const postTime = post.createdAt
              ? new Date(post.createdAt).getTime()
              : 0;

            if (postTime > newestTime) {
              // add to addedPosts if not present
              setAddedPosts(prev => {
                if (prev.some(p => p.id === post.id)) return prev;
                return [post, ...prev]; // newest-first in addedPosts
              });
              return;
            }

            // else: falls inside current listener window -> insert into posts (avoid duplicates)
            setPosts(prev => {
              if (prev.some(p => p.id === post.id)) return prev;
              const merged = [post, ...prev].sort((a, b) => {
                const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tb - ta;
              });
              // cap to listenerLimit to keep window stable
              return merged.slice(0, listenerLimit);
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
        // optional: you can log or handle permission/index errors here
        console.error("Live feed listener error:", err);
      }
    );

    unsubRef.current = unsub;

    return () => {
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {
          // ignore
        }
        unsubRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenerLimit]);

  // --- merge added posts into main feed (call from UI) ---
  const mergeAddedPosts = () => {
    if (!addedRef.current.length) return;

    setPosts(prev => {
      // preserve desc sort and dedupe
      const map = new Map<string, PostProps>();
      // first add new posts in chronological order so they appear correctly when prepended
      // addedRef.current is newest-first, reverse to oldest-first so merged order is correct
      for (const p of addedRef.current.slice().reverse()) map.set(p.id, p);
      for (const p of prev) map.set(p.id, p);
      const merged = Array.from(map.values()).sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      return merged;
    });

    // expand listener window to include merged posts (so they become realtime-covered)
    setListenerLimit(l => l + addedRef.current.length);
    setAddedPosts([]);
  };

  // --- pagination: load older posts, then expand listener window so those pages become realtime-aware ---
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

      const qs = await getDocs(q);
      const morePosts = qs.docs.map(toPost);

      // append older posts (they are older, so append)
      setPosts(prev => {
        const map = new Map<string, PostProps>();
        for (const p of prev) map.set(p.id, p);
        for (const p of morePosts) map.set(p.id, p);
        const merged = Array.from(map.values()).sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        return merged;
      });

      setLastPostRef(qs.docs[qs.docs.length - 1] ?? null);
      setHasMore(qs.docs.length === pageSize);

      // expand listener window by number of newly loaded docs
      setListenerLimit(l => l + morePosts.length);
    } finally {
      setLoadingMore(false);
    }
  };

  // cleanup on unmount (extra safety)
  useEffect(() => {
    return () => {
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {
          // ignore
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
