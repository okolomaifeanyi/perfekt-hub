import { usePostCounts } from "@/lib/store/postCounts";
import { toggleReaction } from "@/lib/utils";

export function useReactionActions(postId: string, userId: string) {
  const { setCounts, counts } = usePostCounts();
  const postCounts = counts[postId];

  const like = async () => {
    const prev = postCounts;
    const liked = postCounts?.userReaction?.liked ?? false;

    setCounts(postId, {
      likeCount: (postCounts?.likeCount ?? 0) + (liked ? -1 : 1),
      // 👇 if removing like, keep dislike count as-is
      dislikeCount: postCounts?.dislikeCount ?? 0,
      userReaction: {
        ...postCounts?.userReaction,
        liked: !liked,
        disliked: false, // mutual exclusivity
      },
    });

    try {
      await toggleReaction({ postId, userId, type: "like" });
    } catch (err) {
      setCounts(postId, prev || {});
      console.error(err);
    }
  };

  const dislike = async () => {
    const prev = postCounts;
    const disliked = postCounts?.userReaction?.disliked ?? false;

    setCounts(postId, {
      dislikeCount: (postCounts?.dislikeCount ?? 0) + (disliked ? -1 : 1),
      likeCount: postCounts?.likeCount ?? 0,
      userReaction: {
        ...postCounts?.userReaction,
        disliked: !disliked,
        liked: false, // mutual exclusivity
      },
    });

    try {
      await toggleReaction({ postId, userId, type: "dislike" });
    } catch (err) {
      setCounts(postId, prev || {});
      console.error(err);
    }
  };

  return { like, dislike };
}
