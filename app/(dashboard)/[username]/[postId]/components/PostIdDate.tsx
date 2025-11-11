import AvatarHoverCard from "@/components/AvatarHoverCard";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCompactTimeAgo } from "@/components/utils";
import { PostProps, UserProps } from "@/lib/types";
import { Dot } from "lucide-react";

const PostIdDate = ({
  user,
  post,
}: {
  user?: UserProps | null;
  post: PostProps;
}) => {
  return (
    <div className="flex space-x-3 items-center">
      <AvatarHoverCard user={user!} />

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
