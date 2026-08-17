"use client";

import PostCard from "@/app/(dashboard)/[username]/[postId]/components/PostCard";
import RecommendationRail from "@/components/feed/RecommendationRail";
import { List } from "@/components/Typography";
import { computeRecommendationSlots } from "@/lib/feed-recommendation-inserts.mjs";
import { PostProps } from "@/lib/types";
import { ScrollPosition } from "react-lazy-load-image-component";

const FEED_RECOMMENDATION_TYPES = [
  "friends",
  "follows",
  "groups",
  "events",
  "videos",
  "saves",
  "matches",
] as const;
type FeedRecommendationType = (typeof FEED_RECOMMENDATION_TYPES)[number];

const Posts = ({
  posts,
  scrollPosition,
  isPage,
  deleteOptimisticPost,
  optimistic,
  // This component is reused for a post's comment thread (see
  // CommentFeed), where "No posts yet. Follow people..." plus a "People
  // you may know" rail made no sense sitting under a reply box — both are
  // overridable so each context gets copy that actually fits it.
  emptyMessage = "No posts yet. Follow people to see their updates!",
  showEmptyRecommendations = true,
}: {
  posts: PostProps[];
  scrollPosition?: ScrollPosition;
  isPage?: boolean;
  deleteOptimisticPost?: (postId: string) => void;
  optimistic?: {
    addOptimisticPost: (p: Partial<PostProps>) => string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    replaceOptimisticPost: (id: string, p: any) => void;
    removeOptimisticPost: (id: string) => void;
  };
  emptyMessage?: string;
  showEmptyRecommendations?: boolean;
}) => {
  if (posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground mb-6">{emptyMessage}</p>
        {showEmptyRecommendations && <RecommendationRail type="friends" />}
      </div>
    );
  }

  const engagementScore = Math.min(
    1,
    Math.max(
      0,
      posts.reduce((sum, post) => {
        const likes = post.likes ?? post.reactions?.likes ?? 0;
        const replies = post.replyCount ?? post.comments?.length ?? 0;
        const quotes = post.quoteCount ?? 0;
        const views = post.views ?? 0;
        const weightedEngagement = likes + replies * 1.5 + quotes * 1.5;

        if (views > 0) {
          return sum + Math.min(1, weightedEngagement / Math.max(views, 1));
        }

        return sum + (weightedEngagement > 0 ? 0.55 : 0.2);
      }, 0) / posts.length
    )
  );

  const recommendationSlots = computeRecommendationSlots({
    itemCount: posts.length,
    engagementScore,
    availableTypes: FEED_RECOMMENDATION_TYPES,
  });
  const recommendationSlotByIndex = new Map(
    recommendationSlots.map(slot => [slot.index, slot])
  );

  const items: React.ReactNode[] = [];

  posts.forEach((post, index) => {
    items.push(
      <li key={post.id}>
        <PostCard
          isPostPage={isPage}
          post={post}
          scrollPosition={scrollPosition}
          deleteOptimisticPost={deleteOptimisticPost}
          optimistic={optimistic}
        />
      </li>
    );

    const slot = recommendationSlotByIndex.get(index + 1);
    if (slot && index !== posts.length - 1) {
      items.push(
        <li key={`suggestion-${slot.type}-${slot.index}`} className="my-6">
          <RecommendationRail type={slot.type as FeedRecommendationType} previewCount={6} layout="horizontal" />
        </li>
      );
    }
  });

  return <List className="space-y-4 list-none m-0! p-0!">{items}</List>;
};

export default Posts;
