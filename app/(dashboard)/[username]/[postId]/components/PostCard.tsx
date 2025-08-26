"use client";

import Reactions from "@/components/feed/post/Reactions";
import Text from "@/components/feed/post/Text";
import PostMedia from "./PostMedia";
import PostMenu from "./PostMenu";
import { Card } from "@/components/ui/card";
import { PostProps } from "@/lib/types";
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
import { usePostWithQuote } from "@/hooks/UsePostWithQuote";
import { useRouter } from "next/navigation";

const PostCard = ({ post }: { post: PostProps }) => {
  const { user, quotedPost, quotedUser } = usePostWithQuote(post);
  const { user: currentUser } = useUserStore(state => state);
  const { friends, following } = useUserConnections();
  const router = useRouter();

  if (!currentUser && !user) return null;

  const isPinned = post?.isPinned;
  const isOwner = user ? currentUser?.uid === user.uid : false;
  const isFollowing = user ? following?.includes(user.uid) : false;
  const isFriend = user ? friends?.includes(user.uid) : false;

  const handleCardClick = (url: string) => {
    router.push(url);
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className="rounded-lg cursor-pointer hover:bg-muted/30 transition"
      onClick={() => user && handleCardClick(`/${user.username}/${post.id}`)}
    >
      <div
        className="flex justify-between items-center px-2"
        onClick={stopPropagation}
      >
        {user && <PostIdDate user={user} post={post} />}
        <div className="flex gap-x-2 items-center">
          {user && currentUser?.uid !== user.uid && (
            <div onClick={stopPropagation}>
              <ConnectDropdown targetUid={user.uid} />
            </div>
          )}

          <div onClick={stopPropagation}>
            <PostMenu
              isOwner={isOwner}
              isFriend={isFriend}
              isFollowing={isFollowing}
              isPinned={isPinned}
              onDelete={async () => await deletePost(post.id)}
              onBlock={async () => {
                if (user && currentUser?.uid && user.uid) {
                  await blockUser(currentUser.uid, user.uid);
                }
              }}
              onUnfriend={async () => {
                if (currentUser?.uid && user?.uid) {
                  await unfriendUser(currentUser.uid, user.uid);
                }
              }}
              onUnfollow={async () => {
                if (currentUser?.uid && user?.uid) {
                  await unfollowUser(currentUser.uid, user.uid);
                }
              }}
              onPin={async () => {
                if (currentUser?.uid) {
                  await pinPost(post.id, currentUser.uid);
                }
              }}
            />
          </div>
        </div>
      </div>

      <Text text={post.content} />
      <div onClick={stopPropagation}>
        <PostMedia post={post} />
      </div>

      <div className="px-2" onClick={stopPropagation}>
        {quotedPost && quotedUser && (
          <Card
            className="rounded-lg"
            onClick={() =>
              handleCardClick(`/${quotedUser.username}/${quotedPost.id}`)
            }
          >
            <div
              className="flex justify-between items-center px-2"
              onClick={stopPropagation}
            >
              <PostIdDate user={quotedUser} post={quotedPost} />
            </div>

            <Text text={quotedPost.content} />

            <div onClick={stopPropagation}>
              <PostMedia post={quotedPost} />
            </div>
          </Card>
        )}
      </div>

      <div onClick={stopPropagation}>
        {user && <Reactions user={user} post={post} />}
      </div>
    </Card>
  );
};

export default PostCard;
