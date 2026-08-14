"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PostProps } from "@/lib/types";
import Lightbox, { Slide, SlideVideo } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Video from "yet-another-react-lightbox/plugins/video";
import { ContainedImage } from "@/components/media/ContainedImage";
import { ContainedVideo } from "@/components/media/ContainedVideo";
import { Button } from "@/components/ui/button";

const PostMedia = ({ post }: { post: PostProps }) => {
  const mediaCount = post?.media?.length || 0;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  // Per-view, not persisted — same pattern as X/Twitter's sensitive-content
  // gate: revealing it once for this render doesn't remember the choice
  // across a fresh page load.
  const [revealed, setRevealed] = useState(false);
  const isSensitive = post.moderationStatus === "sensitive" && !revealed;

  const slides: Slide[] = (post?.media || []).map((media, idx) => {
    if (media.type === "video") {
      return {
        type: "video",
        sources: [
          {
            src: media.src,
            type: "video/mp4",
          },
        ],
      } as SlideVideo;
    } else {
      return {
        src: media.src,
        alt: (idx === 0 && post.aiImageAltText) || undefined,
      };
    }
  });

  return (
    <>
      {/* Collapsed grid view */}
      <div
        className={`relative grid gap-1 max-h-62.5 overflow-hidden ${
          mediaCount === 2
            ? "grid-cols-2"
            : mediaCount === 3
            ? "grid-cols-2 grid-rows-2 h-75"
            : mediaCount === 4
            ? "grid-cols-2 grid-rows-2"
            : ""
        }`}
      >
        {isSensitive && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70 text-center backdrop-blur-xl">
            <AlertTriangle className="size-6 text-muted-foreground" />
            <p className="max-w-56 text-xs font-medium text-muted-foreground">
              This post may contain sensitive content
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={e => {
                e.stopPropagation();
                setRevealed(true);
              }}
            >
              View
            </Button>
          </div>
        )}
        {post?.media?.map((media, idx) => {
          const isThree = mediaCount === 3;
          const isFirst = idx === 0;

          let containerClass = `relative w-full overflow-hidden cursor-pointer bg-muted/20`;

          if (mediaCount === 1) {
            containerClass += " aspect-video h-full";
          } else if (isThree && isFirst) {
            containerClass += " row-span-2 h-full";
          } else {
            containerClass += " aspect-square h-full";
          }

          return (
            <div
              key={idx}
              className={containerClass}
              onClick={() => {
                if (isSensitive) return;
                setIndex(idx);
                setOpen(true);
              }}
            >
              {media.type === "video" ? (
                <ContainedVideo
                  src={media.src}
                  className="h-full w-full"
                  autoPlayOnHover={!isSensitive}
                  muted // avoid noisy previews by default
                  loop
                  controls={false}
                  showMuteToggle={!isSensitive}
                />
              ) : (
                <ContainedImage
                  src={media.src}
                  alt={(idx === 0 && post.aiImageAltText) || `Post media ${idx + 1}`}
                  unoptimized
                  className="h-full w-full"
                  imageClassName="object-contain"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox with Video plugin */}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
        plugins={[Video]}
        video={{
          controls: true,
          playsInline: true,
        }}
      />
    </>
  );
};

export default PostMedia;
