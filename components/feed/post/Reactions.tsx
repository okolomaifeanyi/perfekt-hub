import { PostReplyDialog } from "@/components/post-composer/PostReplyDialog";
import { SharePostDialog } from "@/components/post-composer/PostShareDialog";
import { QuotePostDialog } from "@/components/post-composer/QuotePostDialog";
import { ReactionButton } from "@/components/feed/post/ReactionButton";
import { usePostCounts } from "@/lib/store/postCounts";
import { useRealtimePostCounts } from "@/hooks/usePostCount";
import { useUserStore } from "@/lib/store/useUserStore";
import { OptimisticCallbacks, PostProps, UserProps } from "@/lib/types";
import { toggleReaction } from "@/lib/utils";
import { Heart, Eye, ThumbsDown } from "lucide-react";

const Reactions = ({
  post,
  user,
  optimistic,
}: {
  user: UserProps;
  post: PostProps;
  optimistic?: OptimisticCallbacks;
}) => {
  // usePostCounts is a global-by-postId store, but nothing ever wrote real
  // data into it — the only writes were this component's own optimistic
  // like/dislike updates. Every counter (likes, dislikes, views, and reply
  // count read by PostReplyDialog below) silently showed 0 on every fresh
  // load until the current user personally liked/disliked that exact post.
  useRealtimePostCounts(post.id);
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
    <div className="flex items-center gap-3 border-t border-border/60 pt-3">
      <ReactionButton
        icon={Heart}
        count={likeCount}
        active={liked}
        hoverClass="hover:text-red-500"
        activeClass="text-red-500"
        label="Like"
        onClick={handleLike}
      />

      <ReactionButton
        icon={ThumbsDown}
        count={dislikeCount}
        active={disliked}
        hoverClass="hover:text-blue-600"
        activeClass="text-blue-600"
        label="Dislike"
        onClick={handleDislike}
      />

      <PostReplyDialog user={user} post={post} />
      <QuotePostDialog user={user} post={post} optimistic={optimistic} />
      <SharePostDialog username={user.username} postId={post.id} title="Share" />

      <span title="Views" className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <Eye size={14} fill={viewed ? "currentColor" : "none"} className={viewed ? "text-purple-600" : ""} />
        {viewCount > 0 && <span className={viewed ? "text-purple-600" : ""}>{viewCount}</span>}
      </span>
    </div>
  );
};

export default Reactions;
