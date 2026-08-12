"use client";

import { useEffect, useState } from "react";

import { db } from "@/lib/supabase";
import { collection, onSnapshot } from "@/lib/supabase";
import { getPost } from "@/lib/data";
import { PostProps } from "@/lib/types";
import PostCard from "../[postId]/components/PostCard";

type SavedPostDoc = {
  postId?: string;
} & Partial<PostProps>;

async function resolveSavedPost(
  docId: string,
  data: SavedPostDoc
): Promise<PostProps | null> {
  if (data.content && data.id) {
    return {
      ...(data as PostProps),
      id: data.id,
    };
  }

  const postId = data.postId || docId;
  return getPost(postId);
}

export default function SavedPostsGrid({
  uid,
  mediaType = "all",
}: {
  uid: string;
  mediaType?: "all" | "video";
}) {
  const [items, setItems] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, "users", uid, "savedPosts");
    const unsub = onSnapshot(
      ref,
      snap => {
        setLoading(true);
        void Promise.all(
          snap.docs.map(async docSnap => {
            const data = docSnap.data() as SavedPostDoc;
            return resolveSavedPost(docSnap.id, {
              ...data,
              id: data.id ?? docSnap.id,
            });
          })
        )
          .then(resolved =>
            resolved.filter((post): post is PostProps => Boolean(post))
          )
          .then(resolved =>
            resolved.filter(post =>
              mediaType === "all"
                ? true
                : (post.media || []).some(media => media.type === "video")
            )
          )
          .then(setItems)
          .finally(() => setLoading(false));
      },
      error => {
        console.error("saved posts listener failed", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [mediaType, uid]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading saved posts…</p>;
  }

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">No saved posts yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(post => (
        <PostCard key={post.id} post={post} isPostPage />
      ))}
    </div>
  );
}
