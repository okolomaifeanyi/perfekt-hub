"use client";

import { getSupabaseToken } from "@/lib/utils";
import { useEffect } from "react";

export default function ViewTracker({ postId }: { postId: string }) {

  useEffect(() => {

    const recordView = async () => {
      try {
        const token = await getSupabaseToken();
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
