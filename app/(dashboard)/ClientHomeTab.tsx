"use client";

import Feed from "@/components/feed/Feed";
import { P } from "@/components/Typography";
import { usePostsLiveFeed } from "@/hooks/PostsLiveFeed";
import { useUserConnections } from "@/hooks/UserConnections";

const ClientHomeTab = () => {
  const { friends, watched } = useUserConnections();
  const { newPosts, clearAlert, posts, getNewPosts } = usePostsLiveFeed({
    friends: friends || [],
    watched: watched || [],
  });

  const count = newPosts.length;

  const handleShowNewPosts = () => {
    clearAlert(); 
    getNewPosts();
  };

  return (
    <div>
      {count > 0 && (
        <div onClick={handleShowNewPosts} className="flex justify-center">
          <P className="!m-0 cursor-pointer">
            Show {count} new post{count > 1 ? "s" : ""}
          </P>
        </div>
      )}
      <Feed initialPosts={posts} />
    </div>
  );
};

export default ClientHomeTab;
