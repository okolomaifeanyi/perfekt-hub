"use client";

import MyAvatar from "@/components/feed/post/MyAvatar";
import Name from "@/components/feed/post/Name";
import Reactions from "@/components/feed/post/Reactions";
import Text from "@/components/feed/post/Text";
// import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import { getCompactTimeAgo } from "@/components/utils";
import { PostProps } from "@/lib/types";
import { Dot } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const PostCard = ({ post }: { post: PostProps }) => {
  const router = useRouter();
  const altImage = userAltImageUrl({ name: post.username });
  const mediaCount = post?.media?.length || 0;

  const getRoundedClass = (index: number) => {
    if (mediaCount === 1) return "rounded-md";
    if (mediaCount === 2) {
      if (index === 0) return "rounded-l-md";
      if (index === 1) return "rounded-r-md";
    }
    if (mediaCount === 3) {
      if (index === 0) return "rounded-l-md";
      if (index === 1) return "rounded-tr-md";
      if (index === 2) return "rounded-br-md";
    }
    if (mediaCount === 4) {
      if (index === 0) return "rounded-tl-md";
      if (index === 1) return "rounded-tr-md";
      if (index === 2) return "rounded-bl-md";
      if (index === 3) return "rounded-br-md";
    }
    return "";
  };



  return (
    <Card
      className="p-2 rounded cursor-pointer"
      onClick={() => {
        router.push(`/${post.username}/${post.id}`);
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex space-x-2 items-center">
          <MyAvatar
            src={post.userPhotoURL || altImage}
            alt={`${post.username}'s avatar`}
            link={post.username}
          />
          <Name fullName={post.userFullName} username={post.username} />

          <span className="text-xs text-muted-foreground flex items-center">
            <Dot />{getCompactTimeAgo(new Date(post.createdAt))}
          </span>
        </div>
        {/* <Button size="sm">Follow</Button> */}
      </div>

      <Text text={post.content} />

      <div
        className={`grid gap-1 max-h-[250px] overflow-hidden ${
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

          let containerClass = `relative w-full overflow-hidden ${getRoundedClass(
            index
          )}`;

          if (mediaCount === 1) {
            containerClass += " aspect-video";
          } else if (isThree && isFirst) {
            containerClass += " row-span-2 h-full";
          } else {
            containerClass += " aspect-square h-full";
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

      <Reactions reactions={post.reactions} />
    </Card>
  );
};

export default PostCard;
