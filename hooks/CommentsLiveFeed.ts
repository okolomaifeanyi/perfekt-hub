import { db } from "@/lib/supabase";
import { PostProps } from "@/lib/types";
import { collection, onSnapshot, orderBy, query, where, limit as limitFn } from "@/lib/supabase";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

export function useLiveComments(postId: string, limit = 10) {
  const [comments, setComments] = useState<PostProps[]>([]);
  const didInitialLoad = useRef(false);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("parentPostId", "==", postId),
      orderBy("createdAt", "asc"),
      limitFn(limit)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      if (didInitialLoad.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === "added") {
            const newComment = change.doc.data();
            toast.success(`🗨️ New reply from @${newComment.username}`);
          }
        });
      } else {
        didInitialLoad.current = true;
      }

      const updated = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          content: data.content,
          media: data.media || [],
          createdAt: data.createdAt?.toDate().toISOString() ?? null,
          username: data.username,
          userFullName: data.userFullName || "",
          userPhotoURL: data.userPhotoURL,
          parentPostId: data.parentPostId,
          linkPreview: data.linkPreview || null,
        };
      });

      setComments(updated);
    });

    return () => unsubscribe();
  }, [postId, limit]);

  return comments;
}
