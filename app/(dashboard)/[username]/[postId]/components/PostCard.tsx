"use client";

import Reactions from "@/components/feed/post/Reactions";
import Text from "@/components/feed/post/Text";
import PostMedia from "./PostMedia";
import PostMenu from "./PostMenu";
import { Card } from "@/components/ui/card";
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
import ConnectDropdown from "@/components/Connect";
import PostIdDate from "./PostIdDate";

const PostCard = ({
  post,
  user,
  quotedPost,
  quotedUser,
  replyCount
}: {
  post: PostProps;
  user: UserProps;
  quotedPost?: PostProps | null;
  quotedUser?: UserProps | null;
  replyCount?: number | null
}) => {
  const { user: currentUser } = useUserStore(state => state);
  const { friends, following } = useUserConnections();

  if (!currentUser) return null;

  const isPinned = post?.isPinned;
  const isOwner = currentUser.uid === user.uid;
  const isFollowing = following?.includes(user.uid);
  const isFriend = friends?.includes(user.uid);

  return (
    <Card className="rounded-lg">
      <div className="flex justify-between items-center px-2">
        <PostIdDate user={user} post={post} />
        <div className="flex gap-x-2 items-center">
          {currentUser.uid !== user.uid && (
            <ConnectDropdown targetUid={user.uid} />
          )}

          <PostMenu
            isOwner={isOwner}
            isFriend={isFriend}
            isFollowing={isFollowing}
            isPinned={isPinned}
            onDelete={async () => await deletePost(post.id)}
            onBlock={async () => await blockUser(currentUser?.uid, user.uid)}
            onUnfriend={async () =>
              await unfriendUser(currentUser?.uid, user.uid)
            }
            onUnfollow={async () =>
              await unfollowUser(currentUser?.uid, user.uid)
            }
            onPin={async () => await pinPost(post.id, currentUser.uid)}
          />
        </div>
      </div>

      <Text text={post.content} />
      <PostMedia post={post} />

      <div className="px-2">
      {quotedPost && quotedUser && (
        <Card className="rounded-lg">
          <div className="flex justify-between items-center px-2">
            <PostIdDate user={quotedUser} post={quotedPost} />
          </div>
          <Text text={quotedPost.content} />
          <PostMedia post={quotedPost} />
        </Card>
      )}</div>

      <Reactions replyCount={replyCount} currentUser={currentUser} user={user} post={post} />
    </Card>
  );
};

export default PostCard;
