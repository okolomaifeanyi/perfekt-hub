"use client";

import { useLiveFeed } from "@/hooks/useLiveFeed";
import PostComposer from "./post-composer/PostComposer";
import { useUserStore } from "@/lib/store/useUserStore";

const ComposerClient = ({ onSuccess }: { onSuccess?: () => void }) => {
  const currentUser = useUserStore(s => s.user);

  const currentUserId = currentUser?.uid;
  const { addOptimisticPost, replaceOptimisticPost, removeOptimisticPost } =
    useLiveFeed(currentUserId, undefined, "poll");

  return (
    <PostComposer
      onSuccess={onSuccess}
      optimistic={{
        addOptimisticPost,
        replaceOptimisticPost,
        removeOptimisticPost,
      }}
    />
  );
};

export default ComposerClient;
