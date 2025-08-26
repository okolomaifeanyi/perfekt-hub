import { PostReplyDialog } from "@/components/post-composer/PostReplyDialog";
import { QuotePostDialog } from "@/components/post-composer/QuotePostDialog";
import { Button } from "@/components/ui/button";
import { usePostCounts } from "@/lib/store/postCounts";
import { useUserStore } from "@/lib/store/useUserStore";
import { PostProps, UserProps } from "@/lib/types";
import { toggleReaction } from "@/lib/utils";
import { Heart, View, Share, ThumbsDown } from "lucide-react";

const Reactions = ({ post, user }: { user: UserProps; post: PostProps }) => {
  const postCounts = usePostCounts(state => state.counts[post.id]);
  const { user: currentUser } = useUserStore(state => state);
  if (!currentUser) return null;

  const liked = postCounts?.userReaction?.liked ?? false;

  const disliked = postCounts?.userReaction?.disliked ?? false;

  const viewed = postCounts?.userReaction?.viewed ?? false;

  const likeCount = (postCounts?.likeCount ?? 0);

  const dislikeCount = (postCounts?.dislikeCount ?? 0);

  const viewCount = (postCounts?.viewCount ?? 0);

  console.log({viewCount});
  

  const handleLike = async () => {
    await toggleReaction({
      postId: post.id,
      userId: currentUser.uid,
      type: "like",
    });
  };

  const handleDislike = async () => {
    await toggleReaction({
      postId: post.id,
      userId: currentUser.uid,
      type: "dislike",
    });
  };

  return (
    <div className="flex justify-between items-center px-2">
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant={liked ? "outline" : "secondary"}
          title="Like"
          onClick={handleLike}
          className="flex items-center gap-1 hover:text-[#f42525]"
        >
          <Heart
            fontSize={16}
            fill={liked ? "#f42525" : "none"}
            color={liked ? "#f42525" : undefined}
          />
          {likeCount > 0 && (
            <span className={`${liked ? "text-[#f42525]" : ""} text-base`}>
              {likeCount}
            </span>
          )}
        </Button>

        <Button
          size="sm"
          variant={disliked ? "outline" : "secondary"}
          title="Dislike"
          onClick={handleDislike}
          className="flex items-center gap-1 hover:text-[#17559b]"
        >
          <ThumbsDown
            fontSize={16}
            fill={disliked ? "#17559b" : "none"}
            color={disliked ? "#17559b" : undefined}
          />
          {dislikeCount > 0 && (
            <span className={`${disliked ? "text-[#17559b]" : ""} text-base`}>
              {dislikeCount}
            </span>
          )}
        </Button>
      </div>

      <div className="flex space-x-2">
        <PostReplyDialog user={user} post={post} />
        <QuotePostDialog user={user} post={post} />
      </div>

      <div className="flex space-x-2">
        <Button
          size="sm"
          variant={viewed ? "outline" : "secondary"}
          title="views"
          className="flex items-center gap-1 hover:text-purple-500"
          disabled
        >
          <View
            fontSize={16}
            fill={disliked ? "#6a0fff" : "none"}
            color={disliked ? "#6a0fff" : undefined}
          />

          {viewCount > 0 && (
            <span className={`${viewed ? "text-purple-500" : ""} text-base`}>
              {viewCount}
            </span>
          )}
        </Button>

        <Button
          size="sm"
          variant="secondary"
          title="Share"
          className="hover:text-purple-500"
        >
          <Share />
        </Button>
      </div>
    </div>
  );
};

export default Reactions;
