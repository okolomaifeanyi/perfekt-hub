"use client";

import Feed from "@/components/feed/Feed";
import { P } from "@/components/Typography";
import { usePostsLiveFeed } from "@/hooks/PostsLiveFeed";
import { useUserConnections } from "@/hooks/UserConnections";
import { getInitialPosts } from "@/lib/data";

const ClientHomeTab = () => {
  const { friends, watched } = useUserConnections();

  const { count, clear, posts } = usePostsLiveFeed({
    friends: friends || [],
    watched: watched || [],
  });  

  return (
    <>
      {count > 0 && (
        <div
          onClick={async () => {
            await getInitialPosts();
            clear();
          }}
          className="py-4 mx-auto"
        >
          <P>
            Show {count} new post{count > 1 ? "s" : ""}
          </P>
        </div>
      )}
      <Feed initialPosts={posts} />
    </>
  );
};

export default ClientHomeTab;
