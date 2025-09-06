"use client";

import { db } from "@/lib/firebase";
import { PostProps } from "@/lib/types";
import {
  query,
  collection,
  where,
  onSnapshot,
  orderBy,
  getDocs,
  startAfter,
  limit,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { useEffect, useRef, useState, useCallback } from "react";

const PAGE_SIZE = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeISOString(val: any): string {
  try {
    if (val instanceof Date) return val.toISOString();
    if (val?.toDate instanceof Function) return val.toDate().toISOString();
  } catch (err) {
    console.error("Failed to convert to ISO string:", err);
  }
  return new Date(0).toISOString();
}

export function useUserFeed(username: string) {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const isInitialLoad = useRef(true);

  // 🔹 Initial load + live updates
  useEffect(() => {
    if (!username) return;

    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", ""),
      where("username", "==", username),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      if (isInitialLoad.current) {
        // 🟢 First snapshot = initial posts
        const initial: PostProps[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            createdAt: toSafeISOString(data.createdAt),
            userId: data.userId,
            content: data.content,
            media: data.media || [],
            username: data.username,
            userFullName: data.userFullName || "",
            userPhotoURL: data.userPhotoURL,
            quotePostId: data.quotePostId || null,
            linkPreview: data.linkPreview || null,
          };
        });

        setPosts(initial);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        isInitialLoad.current = false;
        return;
      }

      // 🟡 Handle live updates
      snapshot.docChanges().forEach(change => {
        const doc = change.doc;
        const data = doc.data();

        if (change.type === "modified") {
          setPosts(prev =>
            prev.map(p =>
              p.id === doc.id
                ? { ...p, ...data, createdAt: toSafeISOString(data.createdAt) }
                : p
            )
          );
        }

        if (change.type === "removed") {
          setPosts(prev => prev.filter(p => p.id !== doc.id));
        }
      });
    });

    return () => unsubscribe();
  }, [username]);

  // 🔹 Pagination
  const loadMorePosts = useCallback(async () => {
    if (!lastVisible || !hasMore || !username) return;

    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", ""),
      where("username", "==", username),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      setHasMore(false);
      return;
    }

    const more: PostProps[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        createdAt: toSafeISOString(data.createdAt),
        userId: data.userId,
        content: data.content,
        media: data.media || [],
        username: data.username,
        userFullName: data.userFullName || "",
        userPhotoURL: data.userPhotoURL,
        quotePostId: data.quotePostId || null,
        linkPreview: data.linkPreview || null,
      };
    });

    setPosts(prev => [...prev, ...more]);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
  }, [lastVisible, hasMore, username]);

  return { posts, loadMorePosts, hasMore };
}
