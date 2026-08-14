// app/(dashboard)/feed/Feed.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  ScrollPosition,
  trackWindowScroll,
} from "react-lazy-load-image-component";
import { Loader2, PencilLine } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Posts from "./post/Posts";
import { useUserStore } from "@/lib/store/useUserStore";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import PostComposer from "../post-composer/PostComposer";
import { Button } from "../ui/button";
import ComposePostDialog from "./ComposePostDialog";
import { OnlineFriendsStrip } from "../OnlineFriendsStrip";

interface FeedProps {
  scrollPosition?: ScrollPosition;
  initialTab?: "latest" | "trending";
}

export const Feed = ({ scrollPosition, initialTab = "latest" }: FeedProps) => {
  const currentUser = useUserStore(s => s.user);
  const uid = currentUser?.uid ?? null;

  const [activeTab, setActiveTab] = useState<"latest" | "trending">(
    initialTab
  );
  const [composeOpen, setComposeOpen] = useState(false);
  const scrollMemory = useRef<{ latest: number; trending: number }>({
    latest: 0,
    trending: 0,
  });

  const latestFeed = useLiveFeed(uid, 10, null, false, "latest");
  const trendingFeed = useLiveFeed(uid, 10, null, false, "trending");

  const activeFeed = activeTab === "latest" ? latestFeed : trendingFeed;

  const getScrollContainer = () =>
    document.querySelector<HTMLElement>('[data-dashboard-scroll-container="true"]');

  const { ref: latestLoadMoreRef, inView: latestInView } = useInView({
    triggerOnce: false,
    rootMargin: "600px 0px",
  });
  const { ref: trendingLoadMoreRef, inView: trendingInView } = useInView({
    triggerOnce: false,
    rootMargin: "600px 0px",
  });
  const { ref: composerInViewRef, inView: composerInView } = useInView({
    triggerOnce: false,
    threshold: 0.2,
  });

  useEffect(() => {
    const inView = activeTab === "latest" ? latestInView : trendingInView;
    if (inView && !activeFeed.loadingMore && activeFeed.hasMore) {
      const timer = setTimeout(() => {
        activeFeed.loadMorePosts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, latestInView, trendingInView, activeFeed]);

  const handleTabChange = (v: string) => {
    const nextTab = v as "latest" | "trending";
    const scrollContainer = getScrollContainer();
    scrollMemory.current[activeTab] = scrollContainer?.scrollTop ?? 0;
    setActiveTab(nextTab);

    setTimeout(() => {
      const targetScrollContainer = getScrollContainer();
      if (!targetScrollContainer) return;

      targetScrollContainer.scrollTo({
        top: scrollMemory.current[nextTab],
        behavior: "auto",
      });
    }, 30);
  };

  const handleComposeClick = () => {
    setComposeOpen(true);
  };

  const NewPostsButton = ({
    count,
    onClick,
    hasRealNewPosts,
    isMerging,
  }: {
    count: number;
    onClick: () => void;
    hasRealNewPosts: boolean;
    isMerging: boolean;
  }) => {
    if (count === 0 || !hasRealNewPosts) return null;

    return (
      <Button
        onClick={onClick}
        disabled={isMerging}
        className="flex justify-center items-center gap-2 py-2 w-full"
      >
        {isMerging ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" />
            <span>Merging...</span>
          </>
        ) : (
          <span className="m-0! font-medium">
            Show {count} new post{count > 1 ? "s" : ""}
          </span>
        )}
      </Button>
    );
  };

  // USER NOT LOGGED IN
  if (!uid) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  // INITIAL LOADING FOR POSTS ONLY
  const isPostsLoading =
    (activeTab === "latest" &&
      latestFeed.loading &&
      latestFeed.posts.length === 0) ||
    (activeTab === "trending" &&
      trendingFeed.loading &&
      trendingFeed.posts.length === 0);

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full rounded-none"
    >
      <TabsList className="flex w-full justify-center gap-2 mb-4 sticky top-0 bg-background/80 backdrop-blur-sm z-20">
        <TabsTrigger
          value="latest"
          disabled={latestFeed.loading && latestFeed.posts.length === 0}
        >
          Latest
        </TabsTrigger>
        <TabsTrigger
          value="trending"
          disabled={trendingFeed.loading && trendingFeed.posts.length === 0}
        >
          Trending
        </TabsTrigger>
      </TabsList>

      {/* Desktop shows online friends in the Aside sidebar (hidden below
          lg) — this is the mobile equivalent, a tap-to-message avatar
          strip, since that sidebar simply isn't there below that
          breakpoint. */}
      <OnlineFriendsStrip />

      {/* POST COMPOSER – ALWAYS VISIBLE */}
      <div ref={composerInViewRef}>
        <PostComposer
          className="px-4"
          optimistic={{
            addOptimisticPost: latestFeed.addOptimisticPost,
            replaceOptimisticPost: latestFeed.replaceOptimisticPost,
            removeOptimisticPost: latestFeed.removeOptimisticPost,
          }}
          isSubmitting={latestFeed.isSubmitting}
        />
      </div>

      <ComposePostDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        optimistic={{
          addOptimisticPost: latestFeed.addOptimisticPost,
          replaceOptimisticPost: latestFeed.replaceOptimisticPost,
          removeOptimisticPost: latestFeed.removeOptimisticPost,
        }}
        isSubmitting={latestFeed.isSubmitting}
      />

      {!composerInView && (
        <Button
          type="button"
          onClick={handleComposeClick}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full p-0 sm:h-auto sm:w-auto sm:min-h-14 sm:px-5 sm:py-4 sm:gap-2"
          aria-label="Compose a post"
        >
          <PencilLine className="size-5" />
          <span className="hidden sm:inline">Compose</span>
        </Button>
      )}

      {/* LATEST TAB */}
      <TabsContent value="latest" className="px-4 space-y-4">
        <NewPostsButton
          count={latestFeed.addedPosts.length}
          onClick={latestFeed.mergeAddedPosts}
          hasRealNewPosts={latestFeed.hasRealNewPosts}
          isMerging={latestFeed.isMergingAdded}
        />

        {/* POSTS LIST WITH LOADING SPINNER */}
        {isPostsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <>
            <Posts
              posts={latestFeed.posts}
              scrollPosition={scrollPosition}
              deleteOptimisticPost={latestFeed.deleteOptimisticPost}
              optimistic={{
                addOptimisticPost: latestFeed.addOptimisticPost,
                replaceOptimisticPost: latestFeed.replaceOptimisticPost,
                removeOptimisticPost: latestFeed.removeOptimisticPost,
              }}
            />
            <div
              ref={latestLoadMoreRef}
              className="flex justify-center py-4 h-10"
            >
              {latestFeed.loadingMore ? (
                <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
              ) : !latestFeed.hasMore && latestFeed.posts.length > 0 ? (
                <span className="text-sm text-muted-foreground">
                  No more posts
                </span>
              ) : null}
            </div>
          </>
        )}
      </TabsContent>

      {/* TRENDING TAB */}
      <TabsContent value="trending" className="px-4 space-y-4">
        <NewPostsButton
          count={trendingFeed.addedPosts.length}
          onClick={trendingFeed.mergeAddedPosts}
          hasRealNewPosts={trendingFeed.hasRealNewPosts}
          isMerging={trendingFeed.isMergingAdded}
        />

        {/* POSTS LIST WITH LOADING SPINNER */}
        {isPostsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <>
            <Posts
              posts={trendingFeed.posts}
              scrollPosition={scrollPosition}
              deleteOptimisticPost={trendingFeed.deleteOptimisticPost}
              optimistic={{
                addOptimisticPost: trendingFeed.addOptimisticPost,
                replaceOptimisticPost: trendingFeed.replaceOptimisticPost,
                removeOptimisticPost: trendingFeed.removeOptimisticPost,
              }}
            />
            <div
              ref={trendingLoadMoreRef}
              className="flex justify-center py-4 h-10"
            >
              {trendingFeed.loadingMore ? (
                <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
              ) : !trendingFeed.hasMore && trendingFeed.posts.length > 0 ? (
                <span className="text-sm text-muted-foreground">
                  No more posts
                </span>
              ) : null}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default trackWindowScroll(Feed);
