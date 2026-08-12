"use client";

import { useState } from "react";
import { PostProps } from "@/lib/types";
import Lightbox, { Slide, SlideVideo } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Video from "yet-another-react-lightbox/plugins/video";
import { ContainedImage } from "@/components/media/ContainedImage";
import { ContainedVideo } from "@/components/media/ContainedVideo";

const PostMedia = ({ post }: { post: PostProps }) => {
  const mediaCount = post?.media?.length || 0;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = (post?.media || []).map(media => {
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
      };
    }
  });

  return (
    <>
      {/* Collapsed grid view */}
      <div
        className={`grid gap-[4px] max-h-[250px] overflow-hidden ${
          mediaCount === 2
            ? "grid-cols-2"
            : mediaCount === 3
            ? "grid-cols-2 grid-rows-2 h-[300px]"
            : mediaCount === 4
            ? "grid-cols-2 grid-rows-2"
            : ""
        }`}
      >
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
                setIndex(idx);
                setOpen(true);
              }}
            >
              {media.type === "video" ? (
                <ContainedVideo
                  src={media.src}
                  className="h-full w-full"
                  autoPlayOnHover
                  muted // avoid noisy previews by default
                  loop
                  controls={false}
                  showMuteToggle
                />
              ) : (
                <ContainedImage
                  src={media.src}
                  alt={`Post media ${idx + 1}`}
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
