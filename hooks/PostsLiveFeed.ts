import { db } from "@/lib/firebase";
import { PostProps } from "@/lib/types";
import {
  query,
  collection,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

export function usePostsLiveFeed({
  friends = [],
  watched = [],
}: {
  friends: string[];
  watched: string[];
}) {
  const [count, setCount] = useState(0);
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [userPhotoURLs, setUserPhotoURLs] = useState<string[]>([]);

  const seenPostIds = useRef<Set<string>>(new Set());
  const didInitialLoad = useRef(false);

  const friendsKey = friends.join(",");
  const watchedKey = watched.join(",");

  const clear = () => {
    setCount(0);
    // setPosts([]);
    setUserPhotoURLs([]);
    seenPostIds.current.clear();
    didInitialLoad.current = false;
  };

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", ""),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const allNewPosts: PostProps[] = [];
      const newPhotoURLs = new Set(userPhotoURLs);
      let newPostCount = 0;

      snapshot.docChanges().forEach(change => {
        if (change.type !== "added") return;

        const doc = change.doc;
        const postId = doc.id;
        const post = doc.data();
        const { uid, userPhotoURL } = post;

        if (seenPostIds.current.has(postId)) return;

        seenPostIds.current.add(postId);
        const createdAt =
          post.createdAt instanceof Date
            ? post.createdAt.toISOString()
            : post.createdAt?.toDate?.() instanceof Date
            ? post.createdAt.toDate().toISOString()
            : new Date(0).toISOString();

        allNewPosts.push({
          id: postId,
          createdAt,
          userId: post.userId,
          content: post.content,
          media: post.media || [],
          username: post.username,
          userFullName: post.userFullName || "",
          userPhotoURL: post.userPhotoURL,
        } as PostProps);
        newPostCount++;

        // Collect photoURL if from friend or watched
        if ((friends.includes(uid) || watched.includes(uid)) && userPhotoURL) {
          newPhotoURLs.add(userPhotoURL);
        }
      });

      if (!didInitialLoad.current) {
        const initialPosts = snapshot.docs.slice(0, 10).map(doc => {
          const data = doc.data();
          const createdAt =
            data.createdAt instanceof Date
              ? data.createdAt.toISOString()
              : data.createdAt?.toDate?.() instanceof Date
              ? data.createdAt.toDate().toISOString()
              : new Date(0).toISOString();

          seenPostIds.current.add(doc.id);
          if (
            (friends.includes(data.uid) || watched.includes(data.uid)) &&
            data.userPhotoURL
          ) {
            newPhotoURLs.add(data.userPhotoURL);
          }

          return {
            id: doc.id,
            userId: data.userId,
            content: data.content,
            media: data.media || [],
            createdAt,
            username: data.username,
            userFullName: data.userFullName || "",
            userPhotoURL: data.userPhotoURL,
          } as PostProps;
        });

        setPosts(initialPosts);
        setUserPhotoURLs(Array.from(newPhotoURLs));
        didInitialLoad.current = true;
        return;
      }

      if (allNewPosts.length > 0) {
        setPosts(prev => {
          const merged = [...allNewPosts, ...prev];
          const uniqueById = Array.from(
            new Map(merged.map(p => [p.id, p])).values()
          );
          return uniqueById.slice(0, 10); // keep latest 10
        });
      }

      if (newPostCount > 0) {
        setCount(prev => prev + newPostCount);
        setUserPhotoURLs(Array.from(newPhotoURLs));
      }
    });

    return () => unsubscribe();
  }, [friendsKey, watchedKey]);

  return { posts, count, userPhotoURLs, clear };
}
