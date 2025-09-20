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
  Unsubscribe,
  where,
  startAfter,
} from "firebase/firestore";
import { useEffect, useState } from "react";

export function useLiveFeed(pageSize = 10) {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [lastPostRef, setLastPostRef] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [addedPosts, setAddedPosts] = useState<PostProps[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const postRef = collection(db, "posts");

  // 🔹 Initial load
  useEffect(() => {
    let mounted = true;
    async function load() {
      const q = query(postRef, orderBy("createdAt", "desc"), limit(pageSize));
      const qs = await getDocs(q);

      const newPosts: PostProps[] = qs.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? null,
        } as PostProps;
      });

      if (!mounted) return;
      setPosts(newPosts);
      setLastPostRef(qs.docs[qs.docs.length - 1] ?? null);
      setHasMore(qs.docs.length === pageSize); // only assume more if we got a full page
    }
    load();
    return () => {
      mounted = false;
    };
  }, [pageSize]);

  // 🔹 Realtime listener for *new* posts
  useEffect(() => {
    if (!posts.length) return;
    const newestDate = posts[0].createdAt;
    if (!newestDate) return;

    const q = query(
      postRef,
      where("createdAt", ">", newestDate),
      orderBy("createdAt", "asc")
    );

    const unSub: Unsubscribe = onSnapshot(q, snapshot => {
      const newlyAdded: PostProps[] = [];

      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const d = change.doc.data();
          newlyAdded.push({
            id: change.doc.id,
            ...d,
            createdAt: d.createdAt?.toDate?.() ?? null,
          } as PostProps);
        }
      });

      if (newlyAdded.length > 0) {
        setAddedPosts(prev => [...prev, ...newlyAdded]);
      }
    });

    return () => unSub();
  }, [posts]);

  // 🔹 Helper: merge added posts into main feed
  const mergeAddedPosts = () => {
    setPosts(prev => [...addedPosts.reverse(), ...prev]); // prepend new ones
    setAddedPosts([]);
  };

  // 🔹 Pagination: load older posts
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
      const morePosts: PostProps[] = qs.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? null,
        } as PostProps;
      });

      setPosts(prev => [...prev, ...morePosts]);
      setLastPostRef(qs.docs[qs.docs.length - 1] ?? null);
      setHasMore(qs.docs.length === pageSize);
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
