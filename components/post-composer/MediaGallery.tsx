import { MediaProps } from "@/lib/types";
import React, { Dispatch, SetStateAction } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { X } from "lucide-react";

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
              className={`relative  ${
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
                <Image
                  src={item.src}
                  alt="Post"
                  width={100}
                  height={100}
                  className="w-full h-full object-cover rounded-lg"
                  unoptimized={item.src.includes("giphy")}
                />
              ) : (
                <video
                  controls
                  className="w-full h-full object-cover rounded-lg"
                >
                  <source src={item.src} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          ))}
        </div>
      )}
    </figure>
  );
};

export default MediaGallery;
