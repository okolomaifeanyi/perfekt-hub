// hooks/useParentPost.ts
"use client";

import { PostProps } from "@/lib/types";
import { useEffect, useState } from "react";
import { doc, getDoc } from "@/lib/supabase";
import { db } from "@/lib/supabase";

export function useParentPost(parentPostId?: string) {
  const [parentPost, setParentPost] = useState<PostProps | null>(null);

  useEffect(() => {
    if (!parentPostId) return;

    async function fetchParent() {
      const snap = await getDoc(doc(db, "posts", parentPostId || ""));
      if (snap.exists()) {
        setParentPost({
          id: snap.id,
          ...snap.data(),
          createdAt: snap.data().createdAt?.toDate?.() ?? new Date(),
        } as PostProps);
      }
    }

    fetchParent();
  }, [parentPostId]);

  return parentPost;
}
