"use client";

import { db } from "@/lib/firebase";
import { PostProps } from "@/lib/types";
import {
  query,
  collection,
  where,
  limit,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import Image from "next/image";
import { useState, useEffect } from "react";

export function MediaGrid({ uid }: { uid: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);

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
        .filter(post => (post.media || []).length > 0); // filter in JS
      setItems(posts);
    });


    return () => unsub();
  }, [uid]);

  // Flatten all media into a single list
  const mediaItems = items.flatMap(post =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (post.media || []).map((m: any) => ({
      ...m,
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
          className="relative aspect-square overflow-hidden rounded-md"
        >
          {m.type === "image" ? (
            <Image
              src={m.src}
              alt="media"
              fill
              sizes="160px"
              className="object-cover"
            />
          ) : (
            <video
              src={m.src}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          )}
        </div>
      ))}
    </div>
  );
}
