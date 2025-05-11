import { PostProps } from "@/lib/types";
import Post from "./post/Post";
import { List } from "../Typography";

interface FeedProps {
  posts: PostProps[];
}

const Feed = ({ posts }: FeedProps) => {
  if (!posts || posts.length === 0) {
    return <p>No posts available</p>;
  }

  return (
    <List className="space-y-4 list-none !m-0 !p-0">
      {posts.map(post => (
        <Post key={post.id} {...post} />
      ))}
    </List>
  );
};

export default Feed;
