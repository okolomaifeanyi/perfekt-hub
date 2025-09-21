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
import PostIdDate from "./PostIdDate";
import { usePostWithQuote } from "@/hooks/UsePostWithQuote";
import { useRouter } from "next/navigation";
import {
  LazyLoadImage,
  ScrollPosition,
  LazyLoadComponent,
} from "react-lazy-load-image-component";

const PostCard = ({
  post,
  scrollPosition,
}: {
  post: PostProps;
  scrollPosition?: ScrollPosition;
}) => {
  const { user, quotedPost, quotedUser } = usePostWithQuote(post);
  const { user: currentUser } = useUserStore(state => state);
  const { friends, following } = useUserConnections();
  const router = useRouter();

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
    <LazyLoadComponent scrollPosition={scrollPosition}>
      <Card
        className="
        cursor-pointer
        transition hover:bg-background/60 backdrop-blur-lg"
        onClick={() => user && handleCardClick(`/${user.username}/${post.id}`)}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-2"
          onClick={stopPropagation}
        >
          <PostIdDate user={user} post={post} />
          <div className="flex gap-x-2 items-center">

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

        {/* Text */}
        <div className="px-2">
          <Text text={post.content} />
        </div>

        {/* Media */}
        <div onClick={stopPropagation}>
          <PostMedia post={post} />
        </div>

        {/* Quoted Post */}
        <div className="px-2" onClick={stopPropagation}>
          {quotedPost && quotedUser && (
            <Card
              className="
              hover:bg-background/50 transition
            "
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

              <div className="px-2">
                <Text text={quotedPost.content} />
              </div>

              <div onClick={stopPropagation}>
                <PostMedia post={quotedPost} />
              </div>
            </Card>
          )}
        </div>

        {post.linkPreview && !quotedPost && (
          <a
            className="px-2"
            href={post.linkPreview.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Card className="overflow-hidden border hover:bg-background/50 transition">
              <div className="flex items-center !py-0">
                {post.linkPreview.image && (
                  <div className="w-28 h-20 px-2 border-r flex-shrink-0">
                    <LazyLoadImage
                      src={post.linkPreview.image}
                      alt={post.linkPreview.title || "Preview image"}
                      className="object-contain w-full h-full"
                      wrapperProps={{
                        style: { transitionDelay: "1s" },
                      }}
                      scrollPosition={scrollPosition}
                    />
                  </div>
                )}

                <div className="pl-4">
                  {post.linkPreview.title && (
                    <h4 className="font-semibold text-sm line-clamp-1 mb-1">
                      {post.linkPreview.title}
                    </h4>
                  )}
                  {post.linkPreview.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {post.linkPreview.description}
                    </p>
                  )}
                  <p className="text-[11px] text-primary">
                    {new URL(post.linkPreview.url).hostname.replace("www.", "")}
                  </p>
                </div>
              </div>
            </Card>
          </a>
        )}

        {/* Reactions */}
        <div className="px-2 pb-2" onClick={stopPropagation}>
          {user && <Reactions user={user} post={post} />}
        </div>
      </Card>
    </LazyLoadComponent>
  );
};

export default PostCard;
