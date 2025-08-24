import { PostReplyDialog } from "@/components/post-composer/PostReplyDialog";
import { QuotePostDialog } from "@/components/post-composer/QuotePostDialog";
import { Button } from "@/components/ui/button";
import { usePostReactions } from "@/hooks/useReactions";
import { PostProps, UserProps } from "@/lib/types";
import {
  Heart,
  View,
  Share,
  ThumbsDown,
} from "lucide-react";

const Reactions = ({ post, user, currentUser, replyCount }: { user: UserProps; post: PostProps, currentUser: UserProps, replyCount?: number | null }) => {
  const { counts, userReaction, loading, isPending, toggleReaction } =
    usePostReactions(post.id, currentUser.uid);

  if (loading) return <p>Loading...</p>;

  const liked = userReaction === "like";
  const disliked = userReaction === "dislike";

  return (
    <div className="flex justify-between items-center px-2">
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant={liked ? "outline" : "secondary"}
          title="Like"
          onClick={() => toggleReaction("like")}
          disabled={isPending}
          className="flex items-center gap-1 hover:text-[#f42525]"
        >
          <Heart
            fontSize={16}
            fill={liked ? "#f42525" : "none"}
            color={liked ? "#f42525" : undefined}
          />
          {(counts.like ?? 0) > 0 && (
            <span className={`${liked ? "text-[#f42525]" : ""} text-base`}>
              {counts.like ?? 0}
            </span>
          )}
        </Button>

        <Button
          size="sm"
          variant={disliked ? "outline" : "secondary"}
          title="Dislike"
          onClick={() => toggleReaction("dislike")}
          disabled={isPending}
          className="flex items-center gap-1 hover:text-[#17559b]"
        >
          <ThumbsDown
            fontSize={16}
            fill={disliked ? "#17559b" : "none"}
            color={disliked ? "#17559b" : undefined}
          />
          {(counts.dislike ?? 0) > 0 && (
            <span className={`${disliked ? "text-[#17559b]" : ""} text-base`}>
              {counts.dislike ?? 0}
            </span>
          )}
        </Button>
      </div>

      <div className="flex space-x-2">
        <PostReplyDialog user={user} post={post} replyCount={replyCount} />
        <QuotePostDialog user={user} post={post} />
      </div>

      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="secondary"
          title="views"
          className="hover:text-purple-500"
        >
          <View />
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
