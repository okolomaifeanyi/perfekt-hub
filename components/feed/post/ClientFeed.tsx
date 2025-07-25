"use client";

import Feed from "../Feed";
import { useLiveComments } from "@/hooks/CommentsLiveFeed";

const ClientFeed = ({ postId }: { postId: string }) => {
  const comments = useLiveComments(postId);

  return <Feed initialPosts={comments} />;
};

export default ClientFeed;
