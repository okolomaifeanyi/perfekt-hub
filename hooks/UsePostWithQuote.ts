import { useEffect, useState } from "react";
import { getPost, getUser, getReplyCount } from "@/lib/data";
import { PostProps, UserProps } from "@/lib/types";

export function usePostWithQuote(post: PostProps) {
  const [user, setUser] = useState<UserProps | null>(null);
  const [quotedPost, setQuotedPost] = useState<PostProps | null>(null);
  const [quotedUser, setQuotedUser] = useState<UserProps | null>(null);
  const [replyCount, setReplyCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch main post user
      const mainUser = await getUser(post.userId);
      setUser(mainUser);

      // Fetch quoted post + user if any
      if (post.quotePostId) {
        const quoted = await getPost(post.quotePostId);
        setQuotedPost(quoted);

        if (quoted) {
          const qUser = await getUser(quoted.userId);
          setQuotedUser(qUser);
        }
      }

      // Fetch reply count
      const replies = await getReplyCount(post.id);
      setReplyCount(replies);
    }

    fetchData();
  }, [post]);

  return { user, quotedPost, quotedUser, replyCount };
}
