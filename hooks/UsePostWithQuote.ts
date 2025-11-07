import { useEffect, useState } from "react";
import { getPost, getUser } from "@/lib/data";
import { PostProps, UserProps } from "@/lib/types";
import { usePostCounts } from "@/lib/store/postCounts";
import { useRealtimePostCounts } from "./usePostCount";

export function usePostWithQuote(post: PostProps) {
  const [user, setUser] = useState<UserProps | null>(null);
  const [quotedPost, setQuotedPost] = useState<PostProps | null>(null);
  const [quotedUser, setQuotedUser] = useState<UserProps | null>(null);
  useRealtimePostCounts(post.id);

  const { counts } = usePostCounts();
  const postCounts = counts[post.id];

  useEffect(() => {
    async function fetchData() {
      // 🚧 guard against missing IDs (prevents Firestore errors)
      if (!post?.userId || post.userId.trim() === "") return;

      const mainUser = await getUser(post.userId);
      setUser(mainUser);

      if (post.quotePostId && post.quotePostId.trim() !== "") {
        const quoted = await getPost(post.quotePostId);
        setQuotedPost(quoted);

        if (quoted?.userId && quoted.userId.trim() !== "") {
          const qUser = await getUser(quoted.userId);
          setQuotedUser(qUser);
        }
      }
    }

    fetchData();
  }, [post]);

  return { user, quotedPost, quotedUser, counts: postCounts };
}
