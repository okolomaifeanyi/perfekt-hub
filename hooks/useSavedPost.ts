"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/supabase";
import { doc, getDoc } from "@/lib/supabase";

export function useIsPostSaved(postId: string, uid: string | undefined) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let active = true;

    void getDoc(doc(db, "users", uid, "savedPosts", postId)).then(snap => {
      if (active) setIsSaved(snap.exists());
    });

    return () => {
      active = false;
    };
  }, [postId, uid]);

  return [isSaved, setIsSaved] as const;
}
