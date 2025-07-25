import { db } from "@/lib/firebase";
import { PostProps } from "@/lib/types";
import {
  query,
  collection,
  where,
  onSnapshot,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { useEffect, useRef, useState, useCallback } from "react";

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

  const seenPostIds = useRef<Set<string>>(new Set());
  const didInitialLoad = useRef(false);

  // const followed = [...friends, ...watched];
  const friendsKey = friends.join(",");
  const watchedKey = watched.join(",");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toSafeISOString = (val: any): string => {
    try {
      if (val instanceof Date) return val.toISOString();
      if (val?.toDate instanceof Function) return val.toDate().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {}
    return new Date(0).toISOString();
  };

  const clearAlert = () => {
    setPosts(prev => {
      const merged = [...newPosts, ...prev];
      const unique = Array.from(new Map(merged.map(p => [p.id, p])).values());
      return unique;
    });
    newPosts.forEach(p => seenPostIds.current.add(p.id));
    setNewPosts([]);
    setNewPostAlert(false);
  };

  const fetchInitial = useCallback(async () => {
    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", ""),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const snapshot = await getDocs(q);

    const freshPhotoURLs = new Set<string>();
    const freshSeen = new Set<string>();

    const freshPosts: PostProps[] = snapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = toSafeISOString(data.createdAt);

      freshSeen.add(doc.id);

      if (
        (friends.includes(data.uid) || watched.includes(data.uid)) &&
        data.userPhotoURL
      ) {
        freshPhotoURLs.add(data.userPhotoURL);
      }

      return {
        id: doc.id,
        createdAt,
        userId: data.userId,
        content: data.content,
        media: data.media || [],
        username: data.username,
        userFullName: data.userFullName || "",
        userPhotoURL: data.userPhotoURL,
      };
    });

    seenPostIds.current = freshSeen;
    setPosts(freshPosts);
    setUserPhotoURLs(Array.from(freshPhotoURLs));
    didInitialLoad.current = true;

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (lastDoc) setLastVisible(lastDoc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendsKey, watchedKey]);

  const getNewPosts = () => {
    clearAlert();
  };

  const loadMorePosts = async () => {
    if (!lastVisible) return;

    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", ""),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(10)
    );

    const snapshot = await getDocs(q);
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
    if (lastDoc) setLastVisible(lastDoc);
  };

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", ""),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const freshPosts: PostProps[] = [];
      const newPhotoURLs = new Set(userPhotoURLs);

      snapshot.docChanges().forEach(change => {
        if (change.type !== "added") return;

        const doc = change.doc;
        const data = doc.data();
        const id = doc.id;

        if (seenPostIds.current.has(id)) return;

        seenPostIds.current.add(id);

        const createdAt = toSafeISOString(data.createdAt);

        const post: PostProps = {
          id,
          createdAt,
          userId: data.userId,
          content: data.content,
          media: data.media || [],
          username: data.username,
          userFullName: data.userFullName || "",
          userPhotoURL: data.userPhotoURL,
        };

        if (
          (friends.includes(data.uid) || watched.includes(data.uid)) &&
          data.userPhotoURL
        ) {
          newPhotoURLs.add(data.userPhotoURL);
        }

        freshPosts.push(post);
      });

      if (!didInitialLoad.current) return;

      if (freshPosts.length > 0) {
        setNewPosts(prev => {
          const merged = [...freshPosts, ...prev];
          const unique = Array.from(
            new Map(merged.map(p => [p.id, p])).values()
          );
          return unique;
        });

        setNewPostAlert(true);
        setUserPhotoURLs(Array.from(newPhotoURLs));
      }
    });

    fetchInitial();
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInitial, friendsKey, watchedKey]);

  return {
    posts,
    newPosts,
    newPostAlert,
    clearAlert,
    getNewPosts,
    loadMorePosts,
    userPhotoURLs,
  };
}
