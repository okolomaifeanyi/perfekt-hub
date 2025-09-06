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
    if (!lastVisible) {
      // 🟡 CHANGED: Also check lastVisible here
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
    if (snapshot.empty) {
      setHasMore(false); // 🟢 ADD: Update state when no more posts are returned
      return;
    }

    const morePosts: PostProps[] = [];
    const photoURLs = new Set(userPhotoURLs);

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      if (seenPostIds.current.has(id)) return;

      seenPostIds.current.add(id);
      const createdAt = toSafeISOString(data.createdAt);

      morePosts.push({
        id,
        createdAt,
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

    setPosts(prev => [...prev, ...morePosts]);
    setUserPhotoURLs(Array.from(photoURLs));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (lastDoc) {
      setLastVisible(lastDoc);
    } else {
      setHasMore(false); // 🟢 ADD: Also handle case where there's no next doc
    }
  };

  // 🟡 REWRITTEN: This useEffect now handles both initial load and live updates
  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", ""),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE) // 🟢 ADDED: Limit the initial query for the listener
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      // 🟢 HANDLE THE VERY FIRST SNAPSHOT AS THE INITIAL DATA
      if (isInitialLoad.current) {
        const initialPosts: PostProps[] = [];

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          initialPosts.push({
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
          seenPostIds.current.add(doc.id); // Mark these as seen
        });

        setPosts(initialPosts);
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        setLastVisible(lastDoc);
        isInitialLoad.current = false; // Mark initial load as complete
        return; // Don't process this first snapshot as "new" posts
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
