import { MediaProps } from "@/lib/types";
import React, { Dispatch, SetStateAction } from "react";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import { ContainedImage } from "../media/ContainedImage";
import { ContainedVideo } from "../media/ContainedVideo";

const MediaGallery = ({
  media,
  setMedia,
}: {
  media: MediaProps[];
  setMedia: Dispatch<SetStateAction<MediaProps[]>>;
}) => {
  return (
    <figure>
      {media.length > 0 && (
        <div className="flex space-x-2 mt-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {media.map((item, index) => (
            <div
              key={index}
              className={`relative bg-muted/20 ${
                media.length > 1
                  ? "min-w-1/2 h-[200px]"
                  : "min-w-full h-[350px]"
              }`}
            >
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-0 right-0 rounded-full !p-1 z-10"
                onClick={() => {
                  setMedia(prev => prev.filter((_, i) => i !== index));
                }}
                aria-label="Remove media"
              >
                <X />
              </Button>
              {item.type === "image" ? (
                <ContainedImage
                  src={item.src}
                  alt="Post"
                  sizes={media.length > 1 ? "(max-width: 640px) 50vw, 33vw" : "100vw"}
                  className="h-full w-full rounded-lg"
                  imageClassName="rounded-lg"
                  unoptimized={item.src.includes("giphy")}
                />
              ) : (
                <ContainedVideo
                  src={item.src}
                  controls
                  className="h-full w-full rounded-lg"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </figure>
  );
};

export default MediaGallery;
