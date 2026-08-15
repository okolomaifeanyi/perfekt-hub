import { useEffect, useState } from "react";
import { getPost, getUser } from "@/lib/data";
import { PostProps, UserProps } from "@/lib/types";
import { usePostCounts } from "@/lib/store/postCounts";
import { useRealtimePostCounts } from "./usePostCount";

// Every post already carries its author's denormalized display fields
// (username/userFullName/userPhotoURL) — getUser() below is a live fetch
// of the full profile, but it can come back null (the `users` table isn't
// readable by a signed-out visitor's browser client — RLS grants that
// table's SELECT to `authenticated` only, to keep PII like email/phone out
// of the public anon API) without that meaning the author is unknown.
// Falling back to the post's own fields avoids flashing "undefined"/a
// blank avatar where a real name and photo were available all along.
function authorFromPost(post: PostProps | null | undefined): UserProps | null {
  if (!post?.userId) return null;
  return {
    uid: post.userId,
    username: post.username || "",
    fullName: post.userFullName || "",
    photoURL: post.userPhotoURL || "",
  };
}

export function usePostWithQuote(post: PostProps) {
  const [user, setUser] = useState<UserProps | null>(() => authorFromPost(post));
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
      setUser(mainUser ?? authorFromPost(post));

      if (post.quotePostId && post.quotePostId.trim() !== "") {
        const quoted = await getPost(post.quotePostId);
        setQuotedPost(quoted);

        if (quoted?.userId && quoted.userId.trim() !== "") {
          const qUser = await getUser(quoted.userId);
          setQuotedUser(qUser ?? authorFromPost(quoted));
        }
      }
    }

    fetchData();
  }, [post]);

  return { user, quotedPost, quotedUser, counts: postCounts };
}
