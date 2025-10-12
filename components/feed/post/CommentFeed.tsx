"use client";

import Posts from "./Posts";
import {
  ScrollPosition,
  trackWindowScroll,
} from "react-lazy-load-image-component";
import { useParams } from "next/navigation";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { useUserStore } from "@/lib/store/useUserStore";

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
  const { posts } = useLiveFeed(uid, 10, postId);

  return <Posts isPage posts={posts} scrollPosition={scrollPosition} />;
};

export default trackWindowScroll(CommentFeed);
