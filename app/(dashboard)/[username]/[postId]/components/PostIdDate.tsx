import MyAvatar from "@/components/feed/post/MyAvatar";
import Name from "@/components/feed/post/Name";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCompactTimeAgo } from "@/components/utils";
import { PostProps, UserProps } from "@/lib/types";
import { Dot } from "lucide-react";
import Link from "next/link";

const PostIdDate = ({
  user,
  post,
}: {
  user?: UserProps | null;
  post: PostProps;
}) => {
  return (
    <div className="flex space-x-3 items-center">
      <MyAvatar
        photoURL={user?.photoURL || post?.userPhotoURL}
        username={user?.username || post?.username}
        fullName={user?.fullName || post?.userFullName}
        createdAt={user?.createdAt}
        uid={user?.uid || post?.userId}
        bio={user?.bio}
        followersCount={user?.followersCount}
        followingCount={user?.followingCount}
        friendsCount={user?.friendsCount}
      />

      <Link href={`/${user?.username}`}>
        <Name fullName={user?.fullName} username={user?.username || "user"} />
      </Link>

      <Tooltip>
        <TooltipTrigger className="text-xs text-muted-foreground flex items-center">
          {post.createdAt ? getCompactTimeAgo(post.createdAt) : "Just now"}
          <Dot />
        </TooltipTrigger>

        <TooltipContent>
          <p>
            {post.createdAt ? post.createdAt?.toLocaleString() : "Just now"}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default PostIdDate;
