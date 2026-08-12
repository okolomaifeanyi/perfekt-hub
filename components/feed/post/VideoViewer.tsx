"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Settings, X } from "lucide-react";

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

type VideoViewerProps = {
  currentUsername: string;
  currentPost: PostProps;
  queue: PostProps[];
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
}: VideoViewerProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [quality, setQuality] = useState<VideoQuality>("auto");

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/watch");
    }
  };

  const activePost = useMemo(() => queue[activeIndex] ?? currentPost, [activeIndex, currentPost, queue]);

  useEffect(() => {
    setActiveIndex(0);
  }, [queue, currentPost.id]);

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

  useEffect(() => {
    const active = queue[activeIndex];
    if (!active || active.id === currentPost.id) return;

    const nextUrl = buildVideoPostUrl(active.username || currentUsername, active.id);
    window.history.replaceState(null, "", nextUrl);
  }, [activeIndex, currentPost.id, currentUsername, queue]);

  if (queue.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
      <div
        ref={scrollContainerRef}
        className={cn(
          "h-full w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory",
          "scroll-smooth"
        )}
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
              className="group relative flex h-dvh snap-start items-center justify-center bg-black"
            >
              <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/10 to-black/70" />

              {videoSrc ? (
                <ContainedVideo
                  src={isActive ? applyVideoQuality(videoSrc, quality) : videoSrc}
                  autoPlay={isActive}
                  controls={false}
                  muted
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

              <div className="pointer-events-none absolute left-4 bottom-4 z-20 max-w-[min(92vw,32rem)] space-y-2">
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

              <div className="pointer-events-none absolute left-4 top-4 z-20">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="pointer-events-auto rounded-full"
                  onClick={handleBack}
                  aria-label="Back"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              </div>

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
                  className="pointer-events-auto"
                  onClick={() => setDetailsOpen(open => !open)}
                  aria-pressed={detailsOpen}
                >
                  {detailsOpen ? "Hide post" : "View post"}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 h-[70dvh] border-t bg-background/95 backdrop-blur-xl",
          "transition-transform duration-300 md:inset-y-0 md:right-0 md:left-auto md:h-dvh md:w-105 md:border-t-0 md:border-l",
          detailsOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"
        )}
        aria-hidden={!detailsOpen}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Post details</p>
            <p className="text-xs text-muted-foreground">
              Scroll to move to the next video.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
        </div>

        <div className="h-[calc(70dvh-57px)] overflow-y-auto p-4 md:h-[calc(100dvh-57px)]">
          <div className="space-y-4">
            <PostCard isPostPage post={activePost} className="mx-0" />
            <CommentFeed postId={activePost.id} />
          </div>
        </div>
      </aside>
    </div>
  );
}
