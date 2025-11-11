"use client";

import Posts from "./Posts";
import {
  ScrollPosition,
  trackWindowScroll,
} from "react-lazy-load-image-component";
import { useParams } from "next/navigation";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { useUserStore } from "@/lib/store/useUserStore";
import PostComposer from "@/components/post-composer/PostComposer";

const CommentFeed = ({
  scrollPosition,
}: {
  scrollPosition: ScrollPosition;
}) => {
  const { postId } = useParams<{
    username: string;
    postId: string;
  }>();

  const currentUser = useUserStore(s => s.user);

  const uid = currentUser?.uid;

  // const comments = useLiveComments(postId);
  const {
    posts,
    deleteOptimisticPost,
    addOptimisticPost,
    replaceOptimisticPost,
    removeOptimisticPost,
    isSubmitting,
  } = useLiveFeed(uid, 10, postId);

  return (
    <>
      <PostComposer
        // className="px-4"
        sendButton="Reply"
        placeholder="Reply this post"
        parentPostId={postId}
        optimistic={{
          addOptimisticPost: addOptimisticPost,
          replaceOptimisticPost: replaceOptimisticPost,
          removeOptimisticPost: removeOptimisticPost,
        }}
        isSubmitting={isSubmitting}
      />
      <Posts
        isPage
        posts={posts}
        scrollPosition={scrollPosition}
        deleteOptimisticPost={deleteOptimisticPost}
      />
    </>
  );
};

export default trackWindowScroll(CommentFeed);
