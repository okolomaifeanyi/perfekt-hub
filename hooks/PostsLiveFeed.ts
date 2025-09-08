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
import { useEffect, useRef, useState } from "react";

const PAGE_SIZE = 10;

export function usePostsLiveFeed({
  friends = [],
  watched = [],
}: {
  friends: string[];
  watched: string[];
}) {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [newPosts, setNewPosts] = useState<PostProps[]>([]);
  const [newPostAlert, setNewPostAlert] = useState(false);
  const [userPhotoURLs, setUserPhotoURLs] = useState<string[]>([]);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // useEffect(() => {
  //   console.log(
  //     "[DEBUG] lastVisible changed:",
  //     lastVisible ? lastVisible.id : "null"
  //   );
  // }, [lastVisible]);

  const [hasMore, setHasMore] = useState(true); // 🟢 ADD: State to track if more posts exist

  const seenPostIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toSafeISOString = (val: any): string => {
    try {
      if (val instanceof Date) return val.toISOString();
      if (val?.toDate instanceof Function) return val.toDate().toISOString();
    } catch (err) {
      console.error("Failed to convert to ISO string:", err);
    }
    return new Date(0).toISOString();
  };

  const getNewPosts = () => {
    setPosts(prev => {
      const merged = [...newPosts, ...prev];
      const unique = Array.from(new Map(merged.map(p => [p.id, p])).values());
      return unique;
    });
    newPosts.forEach(p => seenPostIds.current.add(p.id));
    setNewPosts([]);
    setNewPostAlert(false);
  };

  // 🔹 Load more (next 10 posts)
  const loadMorePosts = async () => {
    // console.log("[loadMorePosts] Triggered. lastVisible:", lastVisible);

    if (!lastVisible && !isInitialLoad.current) {
      // console.warn("[loadMorePosts] No lastVisible, stopping pagination.");

      setHasMore(false);
      return;
    }

    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", ""),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );

    const snapshot = await getDocs(q);
    console.log("[loadMorePosts] Fetched docs:", snapshot.size);

    if (snapshot.empty) {
      console.warn("[loadMorePosts] No more posts, disabling hasMore.");

      setHasMore(false);
      return;
    }

    const morePosts: PostProps[] = [];
    const photoURLs = new Set(userPhotoURLs);

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      if (seenPostIds.current.has(id)) return;
      console.log("[loadMorePosts] Skipping already seen:", id);

      seenPostIds.current.add(id);
      // console.log("[loadMorePosts] Adding new post:", id);

      morePosts.push({
        id,
        createdAt: toSafeISOString(data.createdAt),
        userId: data.userId,
        content: data.content,
        media: data.media || [],
        username: data.username,
        userFullName: data.userFullName || "",
        userPhotoURL: data.userPhotoURL,
        quotePostId: data.quotePostId || null,
        linkPreview: data.linkPreview || null,
      });

      if (
        (friends.includes(data.uid) || watched.includes(data.uid)) &&
        data.userPhotoURL
      ) {
        photoURLs.add(data.userPhotoURL);
      }
    });

    // if (morePosts.length === 0) {
    //   console.warn(
    //     "[loadMorePosts] Snapshot had docs, but all were already seen."
    //   );
    // }

    setPosts(prev => [...prev, ...morePosts]);
    setUserPhotoURLs(Array.from(photoURLs));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    // console.log("[loadMorePosts] New lastVisible:", lastDoc?.id);

    if (!lastDoc) {
      // console.warn("[loadMorePosts] No lastDoc found, disabling hasMore.");
      setHasMore(false);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", ""),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE) // 🟢
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      if (isInitialLoad.current) {
        if (snapshot.empty) {
          // console.warn(
          //   "[onSnapshot] Initial load empty. Falling back to pagination."
          // );
          setLastVisible(null); // allow loadMorePosts to kick in
          isInitialLoad.current = false;
          return;
        }

        const initialPosts: PostProps[] = snapshot.docs.map(doc => {
          const data = doc.data();
          seenPostIds.current.add(doc.id);
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

        setPosts(initialPosts);

        const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        // console.log(
        //   "[onSnapshot] Setting lastVisible to:",
        //   lastDoc?.id || "null"
        // );
        setLastVisible(lastDoc);

        isInitialLoad.current = false;
        return;
      }

      // 🟢 HANDLE SUBSEQUENT UPDATES (REAL NEW POSTS)
      const freshPosts: PostProps[] = [];
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const doc = change.doc;
          if (seenPostIds.current.has(doc.id)) return; // Already seen, ignore

          const data = doc.data();
          freshPosts.push({
            id: doc.id,
            createdAt: toSafeISOString(data.createdAt),
            // ... map other fields
            userId: data.userId,
            content: data.content,
            media: data.media || [],
            username: data.username,
            userFullName: data.userFullName || "",
            userPhotoURL: data.userPhotoURL,
            quotePostId: data.quotePostId || null,
            linkPreview: data.linkPreview || null,
          });
          seenPostIds.current.add(doc.id); // Add to seen list immediately
        }
        // You can handle "modified" and "removed" changes here too if needed
        if (change.type === "removed") {
          const removedId = change.doc.id;
          seenPostIds.current.delete(removedId);

          setPosts(prev => prev.filter(p => p.id !== removedId));
          setNewPosts(prev => prev.filter(p => p.id !== removedId));
        }
      });

      if (freshPosts.length > 0) {
        setNewPosts(prev => [...freshPosts, ...prev]);
        setNewPostAlert(true);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends.join(","), watched.join(",")]); // Dependency array is now simpler

  return {
    posts,
    newPosts,
    newPostAlert,
    getNewPosts,
    loadMorePosts,
    userPhotoURLs,
    hasMore,
  };
}
