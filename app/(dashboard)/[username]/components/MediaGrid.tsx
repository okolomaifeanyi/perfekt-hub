"use client";

import { db } from "@/lib/supabase";
import { PostProps } from "@/lib/types";
import {
  query,
  collection,
  where,
  limit,
  onSnapshot,
  orderBy,
} from "@/lib/supabase";
import { useState, useEffect } from "react";
import { ContainedImage } from "@/components/media/ContainedImage";
import { ContainedVideo } from "@/components/media/ContainedVideo";

export function MediaGrid({
  uid,
  mediaType = "all",
}: {
  uid: string;
  mediaType?: "all" | "image" | "video";
}) {
  const [items, setItems] = useState<PostProps[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(24)
    );

    const unsub = onSnapshot(q, snap => {
      const posts = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PostProps))
        .filter(post => (post.media || []).length > 0)
        .filter(post =>
          mediaType === "all"
            ? true
            : (post.media || []).some(media => media.type === mediaType)
        );
      setItems(posts);
    });


    return () => unsub();
  }, [uid, mediaType]);

  // Flatten all media into a single list
  const mediaItems = items.flatMap(post =>
    (post.media || [])
      .filter(media => (mediaType === "all" ? true : media.type === mediaType))
      .map(media => ({
        ...media,
        postId: post.id,
      }))
  );

  if (!mediaItems.length) {
    return <p className="text-sm text-muted-foreground">No media yet.</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {mediaItems.map(m => (
        <div
          key={m.src}
          className="relative aspect-square overflow-hidden rounded-md bg-muted/20"
        >
          {m.type === "image" ? (
            <ContainedImage
              src={m.src}
              alt="media"
              sizes="160px"
              className="h-full w-full rounded-md"
              imageClassName="rounded-md"
            />
          ) : (
            <ContainedVideo
              src={m.src}
              className="h-full w-full rounded-md"
              videoClassName="rounded-md"
              muted
              playsInline
              loop
            />
          )}
        </div>
      ))}
    </div>
  );
}
