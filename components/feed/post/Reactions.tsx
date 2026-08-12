import { PostReplyDialog } from "@/components/post-composer/PostReplyDialog";
import { SharePostDialog } from "@/components/post-composer/PostShareDialog";
import { QuotePostDialog } from "@/components/post-composer/QuotePostDialog";
import { Button } from "@/components/ui/button";
import { usePostCounts } from "@/lib/store/postCounts";
import { useUserStore } from "@/lib/store/useUserStore";
import { OptimisticCallbacks, PostProps, UserProps } from "@/lib/types";
import { toggleReaction } from "@/lib/utils";
import { Heart, View, ThumbsDown } from "lucide-react";

const Reactions = ({
  post,
  user,
  optimistic,
}: {
  user: UserProps;
  post: PostProps;
  optimistic?: OptimisticCallbacks;
}) => {
  const postCounts = usePostCounts(state => state.counts[post.id]);
  const currentUser = useUserStore(state => state.user);
  if (!currentUser?.uid) return null;

  const liked = postCounts?.userReaction?.liked ?? false;
  const disliked = postCounts?.userReaction?.disliked ?? false;
  const viewed = postCounts?.userReaction?.viewed ?? false;

  const likeCount = postCounts?.likeCount ?? 0;
  const dislikeCount = postCounts?.dislikeCount ?? 0;
  const viewCount = postCounts?.viewCount ?? 0;

  const handleLike = async () => {
    const { setCounts } = usePostCounts.getState();
    const prev = postCounts;

    setCounts(post.id, {
      likeCount: likeCount + (liked ? -1 : 1),
      userReaction: {
        ...postCounts?.userReaction,
        liked: !liked,
        disliked: liked ? postCounts?.userReaction?.disliked ?? false : false,
      },
    });

    try {
      await toggleReaction({ postId: post.id, type: "like" });
    } catch (err) {
      setCounts(post.id, prev || {});
      console.error(err);
    }
  };

  const handleDislike = async () => {
    const { setCounts } = usePostCounts.getState();
    const prev = postCounts;

    setCounts(post.id, {
      dislikeCount: dislikeCount + (disliked ? -1 : 1),
      userReaction: {
        ...postCounts?.userReaction,
        disliked: !disliked,
        liked: disliked ? postCounts?.userReaction?.liked ?? false : false,
      },
    });

    try {
      await toggleReaction({ postId: post.id, type: "dislike" });
    } catch (err) {
      setCounts(post.id, prev || {});
      console.error(err);
    }
  };

  return (
    <div className="flex justify-between items-center">
      {/* Like / Dislike */}
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant={liked ? "outline" : "secondary"}
          title="Like"
          onClick={handleLike}
          className="flex items-center gap-1 hover:text-red-500"
        >
          <Heart
            size={16}
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            className={liked ? "text-red-500" : ""}
          />
          {likeCount > 0 && (
            <span className={`text-base ${liked ? "text-red-500" : ""}`}>
              {likeCount}
            </span>
          )}
        </Button>

        <Button
          size="sm"
          variant={disliked ? "outline" : "secondary"}
          title="Dislike"
          onClick={handleDislike}
          className="flex items-center gap-1 hover:text-blue-600"
        >
          <ThumbsDown
            size={16}
            fill={disliked ? "currentColor" : "none"}
            stroke="currentColor"
            className={disliked ? "text-blue-600" : ""}
          />
          {dislikeCount > 0 && (
            <span className={`text-base ${disliked ? "text-blue-600" : ""}`}>
              {dislikeCount}
            </span>
          )}
        </Button>
      </div>

      {/* Reply / Quote */}
      <div className="flex space-x-2">
        <PostReplyDialog user={user} post={post} />
        <QuotePostDialog user={user} post={post} optimistic={optimistic} />
      </div>

      {/* Views / Share */}
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant={viewed ? "outline" : "secondary"}
          title="Views"
          className="flex items-center gap-1 hover:text-purple-600"
          disabled
        >
          <View
            size={16}
            fill={viewed ? "currentColor" : "none"}
            stroke="currentColor"
            className={viewed ? "text-purple-600" : ""}
          />
          {viewCount > 0 && (
            <span className={`text-base ${viewed ? "text-purple-600" : ""}`}>
              {viewCount}
            </span>
          )}
        </Button>

        <SharePostDialog
          username={user.username}
          postId={post.id}
          title={"Share"}
        />
      </div>
    </div>
  );
};

export default Reactions;
