"use client";

import PostCard from "@/app/(dashboard)/[username]/[postId]/components/PostCard";
import WhoToFollow from "@/components/Features/follow/WhoToFollow";
import { List } from "@/components/Typography";
import { PostProps } from "@/lib/types";
import { ScrollPosition } from "react-lazy-load-image-component";
const SUGGESTIONS_EVERY = 10;

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
  // ─── EMPTY STATE ───────────────────────────────────────────────────────
  if (posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground mb-6">
          No posts yet. Follow people to see their updates!
        </p>
        <WhoToFollow fullPage /> {/* Full suggestions when empty */}
      </div>
    );
  }

  // ─── RENDER POSTS + SUGGESTIONS ───────────────────────────────────────
  const items: React.ReactNode[] = [];

  posts.forEach((post, index) => {
    // Add the post
    items.push(
      <li key={post.id}>
        <PostCard
          isPostPage={isPage}
          post={post}
          scrollPosition={scrollPosition}
          deleteOptimisticPost={deleteOptimisticPost}
        />
      </li>
    );

    // Inject compact WhoToFollow every N posts (but not after the last one)
    const isLast = index === posts.length - 1;
    if ((index + 1) % SUGGESTIONS_EVERY === 0 && !isLast) {
      items.push(
        <li key={`suggestion-${index}`} className="my-6">
          <WhoToFollow compact />
        </li>
      );
    }
  });

  return <List className="space-y-4 list-none !m-0 !p-0">{items}</List>;
};

export default Posts;
