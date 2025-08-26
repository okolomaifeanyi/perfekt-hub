import PostCard from "@/app/(dashboard)/[username]/[postId]/components/PostCard";
import { PostProps } from "@/lib/types";
const Post = ({ post }: { post: PostProps }) => {
  return (
    <li>
      <PostCard post={post} />
    </li>
  );
};

export default Post;
