"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { OptimisticCallbacks, PostProps, UserProps } from "@/lib/types";
import Lightbox, { Slide, SlideVideo } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Video from "yet-another-react-lightbox/plugins/video";
import { ContainedImage } from "@/components/media/ContainedImage";
import { ContainedVideo } from "@/components/media/ContainedVideo";
import { CustomVideoPlayer } from "@/components/media/CustomVideoPlayer";
import { Button } from "@/components/ui/button";
import Reactions from "@/components/feed/post/Reactions";

// Bounds a single image's displayed shape between "not taller than 4:5" and
// "not wider than 16:9" — the same range Twitter/Instagram clamp to. Inside
// this range the image is shown in full (object-contain, its real ratio, no
// gaps because the box now matches it exactly). Outside it — a very tall
// screenshot or a panorama — the box clamps to the bound and the image
// switches to object-cover, trading a small, expected crop for never
// ballooning the card to some extreme height or leaving empty side bars.
const MIN_SINGLE_IMAGE_RATIO = 4 / 5;
const MAX_SINGLE_IMAGE_RATIO = 16 / 9;

const PostMedia = ({
  post,
  user,
  optimistic,
}: {
  post: PostProps;
  // Post author — needed to show reactions (like/reply/quote/share) while
  // a photo or video is expanded, without leaving the lightbox to react.
  // Optional because not every caller has it on hand (e.g. quoted-post
  // previews render their own PostMedia without wiring up reactions there).
  user?: UserProps | null;
  optimistic?: OptimisticCallbacks;
}) => {
  const mediaCount = post?.media?.length || 0;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  // Per-view, not persisted — same pattern as X/Twitter's sensitive-content
  // gate: revealing it once for this render doesn't remember the choice
  // across a fresh page load.
  const [revealed, setRevealed] = useState(false);
  const isSensitive = post.moderationStatus === "sensitive" && !revealed;
  // Single-image posts used to be boxed into a fixed 16:9 frame regardless
  // of the photo's real shape, so anything portrait-oriented sat pillarboxed
  // with visible empty bars on either side. Nothing about an image's
  // dimensions is stored anywhere (see MediaProps), so the real ratio is
  // only knowable once the browser has actually loaded it — start from a
  // reasonable landscape guess and snap to the true ratio on load.
  const [singleImageRatio, setSingleImageRatio] = useState<number | null>(null);

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
        className={`relative grid gap-1 overflow-hidden ${
          mediaCount === 2
            ? "max-h-62.5 grid-cols-2"
            : mediaCount === 3
            ? "max-h-62.5 grid-cols-2 grid-rows-2 h-75"
            : mediaCount === 4
            ? "max-h-62.5 grid-cols-2 grid-rows-2"
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
          const isSingle = mediaCount === 1;

          let containerClass = `relative w-full overflow-hidden cursor-pointer bg-muted/20`;

          if (isSingle) {
            containerClass += " transition-[aspect-ratio] duration-200";
          } else if (isThree && isFirst) {
            containerClass += " row-span-2 h-full";
          } else {
            containerClass += " aspect-square h-full";
          }

          const clampedRatio = singleImageRatio
            ? Math.min(
                MAX_SINGLE_IMAGE_RATIO,
                Math.max(MIN_SINGLE_IMAGE_RATIO, singleImageRatio)
              )
            : null;
          const singleImageNeedsCover =
            singleImageRatio !== null &&
            (singleImageRatio < MIN_SINGLE_IMAGE_RATIO ||
              singleImageRatio > MAX_SINGLE_IMAGE_RATIO);

          return (
            <div
              key={idx}
              className={containerClass}
              style={isSingle ? { aspectRatio: clampedRatio ?? 16 / 9 } : undefined}
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
                  imageClassName={
                    isSingle && singleImageNeedsCover ? "object-cover" : "object-contain"
                  }
                  onNaturalSize={
                    isSingle
                      ? ({ width, height }) => setSingleImageRatio(width / height)
                      : undefined
                  }
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox — the Video plugin is only imported for its slide-type
          declaration; actual video rendering is fully overridden below by
          CustomVideoPlayer (no native controls/download, volume, quality). */}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
        plugins={[Video]}
        carousel={{ imageFit: "contain" }}
        render={{
          slide: ({ slide, offset }) => {
            if (slide.type !== "video") return undefined;
            // Only the current slide actually plays — preloaded
            // neighboring slides (offset !== 0) would otherwise compete
            // for playback before the viewer has even swiped to them.
            return (
              <CustomVideoPlayer
                src={slide.sources[0]?.src ?? ""}
                autoPlay={offset === 0}
                className="h-full w-full"
              />
            );
          },
          controls: () =>
            user ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-4"
                onClick={event => event.stopPropagation()}
              >
                <div className="pointer-events-auto w-full max-w-lg rounded-2xl bg-background/95 px-4 py-3 shadow-lg backdrop-blur-md">
                  <Reactions user={user} post={post} optimistic={optimistic} />
                </div>
              </div>
            ) : null,
        }}
      />
    </>
  );
};

export default PostMedia;
