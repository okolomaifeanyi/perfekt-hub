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
      await toggleReaction({
        postId: post.id,
        userId: currentUser.uid,
        type: "like",
      });
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
      await toggleReaction({
        postId: post.id,
        userId: currentUser.uid,
        type: "dislike",
      });
    } catch (err) {
      setCounts(post.id, prev || {});
      console.error(err);
    }
  };

  return (
    <div className="flex justify-between items-center px-2">
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
        <QuotePostDialog user={user} post={post} />
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

        <Button
          size="sm"
          variant="secondary"
          title="Share"
          className="hover:text-purple-600"
        >
          <Share />
        </Button>
      </div>
    </div>
  );
};

export default Reactions;
