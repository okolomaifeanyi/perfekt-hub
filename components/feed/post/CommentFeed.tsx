"use client";

import { useLiveComments } from "@/hooks/CommentsLiveFeed";
import Posts from "./Posts";
import { ScrollPosition, trackWindowScroll } from "react-lazy-load-image-component";
import { useParams } from "next/navigation";

const CommentFeed = ({
  scrollPosition,
}: {
  scrollPosition: ScrollPosition;
}) => {
  const { postId } = useParams<{
    username: string;
    postId: string;
  }>();

  const comments = useLiveComments(postId);

  return <Posts posts={comments} scrollPosition={scrollPosition} />;
};

export default trackWindowScroll(CommentFeed);
