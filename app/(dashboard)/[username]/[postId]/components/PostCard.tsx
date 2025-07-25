"use client";

import { Dot } from "lucide-react";
import MyAvatar from "@/components/feed/post/MyAvatar";
import Name from "@/components/feed/post/Name";
import Reactions from "@/components/feed/post/Reactions";
import Text from "@/components/feed/post/Text";
import PostMedia from "./PostMedia";
import PostMenu from "./PostMenu";
import { Card } from "@/components/ui/card";
import { getCompactTimeAgo } from "@/components/utils";
import { PostProps, UserProps } from "@/lib/types";
import { useUserStore } from "@/lib/store/useUserStore";
import {
  blockUser,
  deletePost,
  pinPost,
  unfollowUser,
  unfriendUser,
} from "./utils";
import { useUserConnections } from "@/hooks/UserConnections";

const PostCard = ({ post, user }: { post: PostProps; user: UserProps }) => {
  const { user: currentUser } = useUserStore(state => state);
  const { friends, following } = useUserConnections();  

  if (!currentUser) return null;

  const isPinned = post?.isPinned;
  const isOwner = currentUser.uid === user.uid;
  const isFollowing = following?.includes(user.uid);
  const isFriend = friends?.includes(user.uid);

  return (
    <Card className="p-2 rounded cursor-pointer">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2 items-center">
          <MyAvatar
            photoURL={user.photoURL}
            username={user.username}
            fullName={user.fullName}
          />
          <Name fullName={user.fullName} username={user.username} />
          <span className="text-xs text-muted-foreground flex items-center">
            <Dot />
            {getCompactTimeAgo(new Date(post.createdAt))}
          </span>
        </div>

        <PostMenu
          isOwner={isOwner}
          isFriend={isFriend}
          isFollowing={isFollowing}
          isPinned={isPinned}
          onDelete={async () => await deletePost(post.id)}
          onBlock={async () => await blockUser(currentUser?.uid, user.uid)}
          onUnfriend={async () => await unfriendUser(currentUser?.uid, user.uid)}
          onUnfollow={async () => await unfollowUser(currentUser?.uid, user.uid)}
          onPin={async () => await pinPost(post.id, currentUser.uid)}
        />
      </div>

      <Text text={post.content} />
      <PostMedia post={post} />
      <Reactions reactions={post.reactions} />
    </Card>
  );
};

export default PostCard;
