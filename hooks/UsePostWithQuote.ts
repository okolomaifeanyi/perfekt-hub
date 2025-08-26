import { useEffect, useState } from "react";
import { getPost, getUser} from "@/lib/data";
import { PostProps, UserProps } from "@/lib/types";
import { usePostCounts } from "@/lib/store/postCounts";
import { getFirebaseToken } from "@/lib/utils";

export function usePostWithQuote(post: PostProps) {
  const [user, setUser] = useState<UserProps | null>(null);
  const [quotedPost, setQuotedPost] = useState<PostProps | null>(null);
  const [quotedUser, setQuotedUser] = useState<UserProps | null>(null);

  const { counts, setCounts } = usePostCounts();
  const postCounts = counts[post.id];

  useEffect(() => {
  async function fetchData() {
    const mainUser = await getUser(post.userId);
    setUser(mainUser);

    if (post.quotePostId) {
      const quoted = await getPost(post.quotePostId);
      setQuotedPost(quoted);
      if (quoted) {
        const qUser = await getUser(quoted.userId);
        setQuotedUser(qUser);
      }
    }

    // 🔥 fetch all counts + userReaction at once
    const res = await fetch(`/api/posts/${post.id}/counts`, {
      headers: {
        Authorization: `Bearer ${await getFirebaseToken()}`,
      },
    });
    const data = await res.json();

    setCounts(post.id, data);
  }

  fetchData();
}, [post, setCounts]);


  return { user, quotedPost, quotedUser, counts: postCounts };
}
