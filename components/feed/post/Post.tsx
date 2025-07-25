import PostCard from "@/app/(dashboard)/[username]/[postId]/components/PostCard";
import { getUser } from "@/lib/data";
import { UserProps, PostProps } from "@/lib/types";
import { useEffect, useState } from "react";

const Post = ({ post }: { post: PostProps }) => {
  const [user, setUser] = useState<UserProps | null>(null);

  useEffect(() => {
    async function getNewUser() {
      const newUser = await getUser(post.userId);

      setUser(newUser);
    }

    getNewUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!post || !user) return;
  return (
    <li>
      <PostCard post={post} user={user} />
    </li>
  );
};

export default Post;
