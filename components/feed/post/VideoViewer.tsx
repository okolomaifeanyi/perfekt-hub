"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Settings, X } from "lucide-react";

import CommentFeed from "@/components/feed/post/CommentFeed";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContainedVideo } from "@/components/media/ContainedVideo";
import { PostProps } from "@/lib/types";
import { buildCanonicalPostUrl, buildVideoPostUrl } from "@/lib/video-url.mjs";
import { applyVideoQuality, isCloudinaryVideoUrl, VIDEO_QUALITIES } from "@/lib/video-quality.mjs";
import { cn } from "@/lib/utils";
import PostCard from "@/app/(dashboard)/[username]/[postId]/components/PostCard";
import { useVideoQueueStore } from "@/lib/store/useVideoQueueStore";
import { useVideoMuteStore } from "@/lib/store/useVideoMuteStore";

type VideoViewerProps = {
  currentUsername: string;
  currentPost: PostProps;
  queue: PostProps[];
  // Whether scrolling to a different video should rewrite the address bar
  // to that video's own deep-link URL (/[username]/[postId]/video). Default
  // true matches that route's own purpose — each video is independently
  // shareable/bookmarkable there. /watch passes false: it's a continuous
  // reel with its own URL, not a sequence of per-video pages, and
  // rewriting the path away from /watch while scrolling broke Aside's
  // `pathname?.startsWith("/watch")` check, which made the queue sidebar
  // vanish after the first video (confirmed live).
  syncUrlOnScroll?: boolean;
};

type VideoQuality = (typeof VIDEO_QUALITIES)[number];

const QUALITY_LABELS: Record<VideoQuality, string> = {
  auto: "Auto",
  high: "High",
  medium: "Medium",
  low: "Low (data saver)",
};

function getVideoSource(post: PostProps) {
  return post.media?.find(media => media.type === "video")?.src ?? null;
}

export default function VideoViewer({
  currentUsername,
  currentPost,
  queue,
  syncUrlOnScroll = true,
}: VideoViewerProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [quality, setQuality] = useState<VideoQuality>("auto");

  const { setQueue, setActiveIndex: syncActiveIndex, clearQueue } = useVideoQueueStore();
  const { muted, toggleMuted } = useVideoMuteStore();

  // Sync queue and active index to the store so Aside can read it. Depends
  // on `queue` itself (not just []) — navigating to a different video's own
  // page re-renders this component in place with a new `queue` prop rather
  // than remounting it, so a mount-only effect left Aside frozen on the
  // very first video's queue no matter how many videos were opened after,
  // confirmed live.
  useEffect(() => {
    setQueue(queue, 0);
  }, [queue, setQueue]);

  useEffect(() => {
    return () => clearQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncActiveIndex(activeIndex);
  }, [activeIndex, syncActiveIndex]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/watch");
    }
  };

  // The swipe-up/down hint only makes sense before the viewer has scrolled
  // at all — once they've moved past the first video they already know.
  const [hasScrolled, setHasScrolled] = useState(false);

  const activePost = useMemo(() => queue[activeIndex] ?? currentPost, [activeIndex, currentPost, queue]);

  useEffect(() => {
    setActiveIndex(0);
  }, [queue, currentPost.id]);

  useEffect(() => {
    if (activeIndex > 0) setHasScrolled(true);
  }, [activeIndex]);

  // Also dismiss on the first manual scroll/touch, even before the
  // intersection observer settles on a new active section.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || hasScrolled) return;
    const dismiss = () => setHasScrolled(true);
    container.addEventListener("wheel", dismiss, { passive: true });
    container.addEventListener("touchmove", dismiss, { passive: true });
    return () => {
      container.removeEventListener("wheel", dismiss);
      container.removeEventListener("touchmove", dismiss);
    };
  }, [hasScrolled]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      entries => {
        const mostVisible = entries
          .filter(entry => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!mostVisible) return;

        const nextIndex = Number((mostVisible.target as HTMLElement).dataset.index ?? 0);
        setActiveIndex(previous => (previous === nextIndex ? previous : nextIndex));
      },
      {
        root: container,
        threshold: [0.55, 0.7, 0.85],
      }
    );

    sectionRefs.current.forEach(section => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [queue.length]);

  // Listen for jump events fired by the Aside queue panel
  useEffect(() => {
    const handler = (e: Event) => {
      const index = (e as CustomEvent<{ index: number }>).detail.index;
      const section = sectionRefs.current[index];
      section?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("video-queue-jump", handler);
    return () => window.removeEventListener("video-queue-jump", handler);
  }, []);

  useEffect(() => {
    if (!syncUrlOnScroll) return;
    const active = queue[activeIndex];
    if (!active || active.id === currentPost.id) return;

    const nextUrl = buildVideoPostUrl(active.username || currentUsername, active.id);
    window.history.replaceState(null, "", nextUrl);
  }, [activeIndex, currentPost.id, currentUsername, queue, syncUrlOnScroll]);

  if (queue.length === 0) {
    return null;
  }

  return (
    // Full-viewport reel container — no internal sidebar
    <div className="relative flex h-[calc(100svh-3rem)] w-full overflow-hidden bg-black text-white sm:h-screen">
      {/* Back/close — always visible, not hover-gated, since mobile has
          no hover and this is the only way out of a full-screen reel. */}
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute left-4 top-4 z-30 rounded-full"
        onClick={handleBack}
        aria-label="Close video"
      >
        <X className="size-4" />
      </Button>

      {/* Snap-scroll feed */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth scrollbar-none"
      >
        {queue.map((post, index) => {
          const videoSrc = getVideoSource(post);
          const isActive = index === activeIndex;

          return (
            <section
              key={post.id}
              ref={node => {
                sectionRefs.current[index] = node;
              }}
              data-index={index}
              className="group relative flex snap-start items-center justify-center bg-black h-[calc(100svh-3rem)] sm:h-screen"
            >
              <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/10 to-black/70" />

              {videoSrc ? (
                <ContainedVideo
                  src={isActive ? applyVideoQuality(videoSrc, quality) : videoSrc}
                  autoPlay={isActive}
                  controls={false}
                  muted={muted}
                  onToggleMute={toggleMuted}
                  loop
                  showMuteToggle
                  className="relative z-10 h-full w-full"
                  videoClassName="object-contain"
                />
              ) : (
                <div className="relative z-10 flex h-full w-full items-center justify-center px-6 text-center">
                  <p className="max-w-md text-sm text-white/70">
                    This post does not include a video.
                  </p>
                </div>
              )}

              {/* Swipe hint — first video only, dismisses on first scroll */}
              {index === 0 && !hasScrolled && queue.length > 1 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-col items-center gap-0.5 text-white/80">
                  <ChevronDown className="size-6 animate-bounce" />
                  <p className="text-xs font-medium">Swipe up for next</p>
                </div>
              )}

              {/* Caption overlay */}
              <div className="pointer-events-none absolute left-4 bottom-16 z-20 max-w-[min(92vw,28rem)] space-y-1.5">
                <Link
                  href={buildCanonicalPostUrl(post.username || currentUsername, post.id)}
                  className="pointer-events-auto inline-flex rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/60"
                >
                  @{post.username || currentUsername}
                </Link>
                <p className="line-clamp-3 text-sm leading-6 text-white/90">
                  {post.content}
                </p>
              </div>

              {/* Top-right controls */}
              <div
                className={cn(
                  "absolute right-4 top-4 z-20 flex items-center gap-2 transition-opacity",
                  "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                )}
              >
                {isCloudinaryVideoUrl(videoSrc) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="pointer-events-auto rounded-full"
                        aria-label="Video quality settings"
                      >
                        <Settings className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {VIDEO_QUALITIES.map(option => (
                        <DropdownMenuItem
                          key={option}
                          onSelect={() => setQuality(option)}
                          className={option === quality ? "font-semibold" : ""}
                        >
                          {QUALITY_LABELS[option]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="pointer-events-auto rounded-full"
                  onClick={() => setDetailsOpen(open => !open)}
                  aria-pressed={detailsOpen}
                >
                  {detailsOpen ? "Hide" : "Details"}
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      {/* Post details slide-in panel */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 h-[70dvh] border-t bg-background/95 backdrop-blur-xl",
          "transition-transform duration-300 md:inset-y-0 md:right-0 md:left-auto md:h-dvh md:w-105 md:border-t-0 md:border-l",
          detailsOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"
        )}
        aria-hidden={!detailsOpen}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium text-foreground">Post details</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDetailsOpen(false)}
            aria-label="Close post details"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="h-[calc(70dvh-57px)] overflow-y-auto p-4 md:h-[calc(100dvh-57px)]">
          <div className="space-y-4">
            <PostCard isPostPage post={activePost} className="mx-0" />
            <CommentFeed postId={activePost.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
