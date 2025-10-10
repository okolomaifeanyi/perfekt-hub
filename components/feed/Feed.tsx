"use client";

import { useState, useEffect, useRef } from "react";
import { P } from "../Typography";
import {
  ScrollPosition,
  trackWindowScroll,
} from "react-lazy-load-image-component";
import { Loader2 } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Posts from "./post/Posts";
import { useUserStore } from "@/lib/store/useUserStore";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import PostComposer from "../post-composer/PostComposer";

interface FeedProps {
  scrollPosition?: ScrollPosition;
}

const Feed = ({ scrollPosition }: FeedProps) => {
  const currentUser = useUserStore(s => s.user);
  const uid = currentUser?.uid ?? null;

  const [activeTab, setActiveTab] = useState<"latest" | "trending">("latest");
  const scrollMemory = useRef<{ latest: number; trending: number }>({
    latest: 0,
    trending: 0,
  });

  const latestFeed = useLiveFeed(uid, 10, null, false, "latest");
  const trendingFeed = useLiveFeed(uid, 10, null, false, "trending");

  const activeFeed = activeTab === "latest" ? latestFeed : trendingFeed;

  const { ref: latestLoadMoreRef, inView: latestInView } = useInView({
    triggerOnce: false,
    rootMargin: "600px 0px",
  });
  const { ref: trendingLoadMoreRef, inView: trendingInView } = useInView({
    triggerOnce: false,
    rootMargin: "600px 0px",
  });

  useEffect(() => {
    const inView = activeTab === "latest" ? latestInView : trendingInView;
    if (inView) {
      const timer = setTimeout(() => {
        activeFeed.loadMorePosts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, latestInView, trendingInView, activeFeed]);

  const handleTabChange = (v: string) => {
    const nextTab = v as "latest" | "trending";
    scrollMemory.current[activeTab] = window.scrollY;
    setActiveTab(nextTab);

    setTimeout(() => {
      window.scrollTo({
        top: scrollMemory.current[nextTab],
        behavior: "instant",
      });
    }, 30);
  };

  const NewPostsButton = ({
    count,
    onClick,
  }: {
    count: number;
    onClick: () => void;
  }) => {
    if (count === 0) return null;
    return (
      <div
        onClick={onClick}
        className="flex justify-center py-2 bg-muted/10 hover:bg-muted/20 cursor-pointer"
      >
        <P className="!m-0 font-medium">
          Show {count} new post{count > 1 ? "s" : ""}
        </P>
      </div>
    );
  };

  if (!uid) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full rounded-none"
    >
      <TabsList className="flex w-full justify-center gap-2 mb-4 sticky top-0 bg-background/80 backdrop-blur-sm z-20">
        <TabsTrigger value="latest">Latest</TabsTrigger>
        <TabsTrigger value="trending">Trending</TabsTrigger>
      </TabsList>

      <PostComposer
        className="px-4"
        optimistic={{
          addOptimisticPost: latestFeed.addOptimisticPost,
          replaceOptimisticPost: latestFeed.replaceOptimisticPost,
          removeOptimisticPost: latestFeed.removeOptimisticPost,
        }}
      />

      <TabsContent value="latest" className="px-4">
        <NewPostsButton
          count={latestFeed.addedPosts.length}
          onClick={latestFeed.mergeAddedPosts}
        />
        <Posts posts={latestFeed.posts} scrollPosition={scrollPosition} />
        <div ref={latestLoadMoreRef} className="flex justify-center py-4 h-10">
          {latestFeed.loadingMore ? (
            <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
          ) : (
            !latestFeed.hasMore && (
              <span className="text-sm text-muted-foreground">
                No more posts
              </span>
            )
          )}
        </div>
      </TabsContent>

      <TabsContent value="trending" className="px-4">
        <NewPostsButton
          count={trendingFeed.addedPosts.length}
          onClick={trendingFeed.mergeAddedPosts}
        />
        <Posts posts={trendingFeed.posts} scrollPosition={scrollPosition} />
        <div
          ref={trendingLoadMoreRef}
          className="flex justify-center py-4 h-10"
        >
          {trendingFeed.loadingMore ? (
            <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
          ) : (
            !trendingFeed.hasMore && (
              <span className="text-sm text-muted-foreground">
                No more posts
              </span>
            )
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default trackWindowScroll(Feed);
