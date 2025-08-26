"use client";

import { getFirebaseToken } from "@/lib/utils";
import { useEffect, useRef } from "react";

export default function ViewTracker({ postId }: { postId: string }) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return; // prevent second run in dev StrictMode
    hasTracked.current = true;

    const recordView = async () => {
      try {
        const token = await getFirebaseToken();
        await fetch(`/api/posts/${postId}/view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Error recording view:", err);
      }
    };

    recordView();
  }, [postId]);

  return null;
}
