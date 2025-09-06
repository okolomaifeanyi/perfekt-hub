import { PostProps } from "@/lib/types";
import Image from "next/image";

const PostMedia = ({ post }: { post: PostProps }) => {
  const mediaCount = post?.media?.length || 0;

  return (
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
      {post?.media?.map((media, index) => {
        const isThree = mediaCount === 3;
        const isFirst = index === 0;

        let containerClass = `relative w-full overflow-hidden`;

        if (mediaCount === 1) {
          containerClass += " aspect-video"; // full-width video/image
        } else if (isThree && isFirst) {
          containerClass += " row-span-2 h-full"; // first item tall
        } else {
          containerClass += " aspect-square h-full"; // uniform squares
        }

        return (
          <div key={index} className={containerClass}>
            {media.type === "video" ? (
              <video
                src={media.src}
                controls
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
            ) : (
              <Image
                src={media.src}
                alt={`Post media ${index + 1}`}
                fill
                unoptimized={media.src.includes("giphy")}
                className="object-cover"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PostMedia;
