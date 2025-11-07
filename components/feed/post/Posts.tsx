import PostCard from "@/app/(dashboard)/[username]/[postId]/components/PostCard";
import { List } from "@/components/Typography";
import { PostProps } from "@/lib/types";
import { ScrollPosition } from "react-lazy-load-image-component";

const Posts = ({
  posts,
  scrollPosition,
  isPage,
  deleteOptimisticPost,
}: {
  posts: PostProps[];
  scrollPosition?: ScrollPosition;
  isPage?: boolean;
  deleteOptimisticPost?: (postId: string) => void;
}) => {
  return (
    <List className="space-y-4 list-none !m-0 !p-0">
      {posts.map(post => {
        return (
          <li key={post.id}>
            <PostCard
              isPostPage={isPage}
              post={post}
              scrollPosition={scrollPosition}
              deleteOptimisticPost={deleteOptimisticPost}
            />
          </li>
        );
      })}
    </List>
  );
};

export default Posts;
