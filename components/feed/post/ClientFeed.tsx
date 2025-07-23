"use client";

import Feed from "../Feed";
import { useLiveComments } from "@/hooks/Posts";

const ClientFeed = ({ postId }: { postId: string }) => {
  const comments = useLiveComments(postId);

  return <Feed initialPosts={comments} />;
};

export default ClientFeed;
