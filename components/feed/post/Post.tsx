import PostCard from "@/app/(dashboard)/[username]/[postId]/components/PostCard";
import { usePostWithQuote } from "@/hooks/UsePostWithQuote";
import { PostProps } from "@/lib/types";
const Post = ({ post }: { post: PostProps }) => {
  const { user, quotedPost, quotedUser, replyCount } = usePostWithQuote(post);

  if (!post || !user) return null;

  return (
    <li>
      <PostCard
        post={post}
        user={user}
        quotedPost={quotedPost}
        quotedUser={quotedUser}
        replyCount={replyCount}
      />
    </li>
  );
};

export default Post;
