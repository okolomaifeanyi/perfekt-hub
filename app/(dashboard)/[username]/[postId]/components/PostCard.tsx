"use client";

import Reactions from "@/components/feed/post/Reactions";
import Text from "@/components/feed/post/Text";
import PostMedia from "./PostMedia";
import PostMenu from "./PostMenu";
import { Card, CardContent } from "@/components/ui/card";
import { OptimisticCallbacks, PostProps } from "@/lib/types";
import { useUserStore } from "@/lib/store/useUserStore";
import {
  blockUser,
  // deletePost,
  pinPost,
  toggleSavedPost,
  unfollowUser,
  unfriendUser,
} from "./utils";
import { useUserConnections } from "@/hooks/UserConnections";
import { useIsPostSaved } from "@/hooks/useSavedPost";
import PostIdDate from "./PostIdDate";
import { usePostWithQuote } from "@/hooks/UsePostWithQuote";
import { useRouter } from "next/navigation";
import {
  LazyLoadImage,
  ScrollPosition,
  LazyLoadComponent,
} from "react-lazy-load-image-component";
import { useParentPost } from "@/hooks/useParentPost";
import UserCard from "@/components/UserCard";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { safeGetHostname } from "@/components/post-composer/utils";
import { deletePostAction } from "@/app/actions/posts";
import { toast } from "sonner";
import PostCardSkeleton from "./PostCardSkeleton";
import { fallbackColorFromSrc } from "@/lib/image-colors.mjs";

const PostCard = ({
  post,
  scrollPosition,
  className,
  isPostPage,
  deleteOptimisticPost,
  optimistic, // ← ADD
}: {
  post: PostProps;
  scrollPosition?: ScrollPosition;
  className?: string;
  isPostPage?: boolean;
  deleteOptimisticPost?: (postId: string) => void;
  optimistic?: OptimisticCallbacks;
}) => {
  const { user, quotedPost, quotedUser } = usePostWithQuote(post);
  const { user: currentUser } = useUserStore(state => state);
  const { friends, following } = useUserConnections();
  const router = useRouter();
  const parentPost = useParentPost(post.parentPostId);
  const parentPostUser = useUser(parentPost?.userId || "");

  const isPinned = post?.isPinned;
  const isOwner = user ? currentUser?.uid === user.uid : false;
  const isFollowing = user ? following?.includes(user.uid) : false;
  const isFriend = user ? friends?.includes(user.uid) : false;
  const [isSaved, setIsSaved] = useIsPostSaved(post.id, currentUser?.uid);

  const handleCardClick = (url: string) => {
    router.push(url);
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Show skeleton if user is not resolved
  if (!user) {
    return (
      <LazyLoadComponent scrollPosition={scrollPosition}>
        <PostCardSkeleton />
      </LazyLoadComponent>
    );
  }

  return (
    <LazyLoadComponent scrollPosition={scrollPosition}>
      <Card
        className={`${className} 
        cursor-pointer
        transition hover:bg-background/60 backdrop-blur-lg py-4`}
        onClick={() => user && handleCardClick(`/${user.username}/${post.id}`)}
      >
        <CardContent className="space-y-3 px-0">
          {/* Header */}
          <div
            className="flex justify-between items-center px-4"
            onClick={stopPropagation}
          >
            <PostIdDate user={user} post={post} />
            <div className="flex gap-x-2 items-center">
              <div>
                <PostMenu
                  isOwner={isOwner}
                  isFriend={isFriend}
                  isFollowing={isFollowing}
                  isPinned={isPinned}
                  isSaved={isSaved}
                  onDelete={async () => {
                    // 1. Optimistic delete — instant UI
                    deleteOptimisticPost?.(post.id);

                    if (!currentUser?.uid) return;
                    // 2. Server side delete
                    try {
                      await deletePostAction(post.id);
                      toast.success("Post deleted");
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (err: any) {
                      toast.error(err?.message || "Failed to delete post");
                      console.error(err);
                      // you could revert the optimistic delete here if you want
                    }
                    // toast.success("Post deleted");
                  }}
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
                  onToggleSave={async () => {
                    if (!currentUser?.uid) return;
                    const wasSaved = isSaved;
                    setIsSaved(!wasSaved);
                    try {
                      await toggleSavedPost(post.id, currentUser.uid, wasSaved);
                    } catch {
                      setIsSaved(wasSaved);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {!isPostPage && parentPost && (
            <div className="px-4 text-gray-500" onClick={stopPropagation}>
              Replying to{" "}
              <UserCard user={parentPostUser}>
                <Link className="text-primary" href={`/${parentPost.username}`}>
                  @{parentPost.username}
                </Link>
              </UserCard>
            </div>
          )}

          {/* Text — deliberately NOT wrapped in stopPropagation. Clicking a
              post's body text is the single most obvious way a user expects
              to open it, and this used to swallow that click entirely;
              mentions/links inside stop propagation themselves instead (see
              RichText.tsx) so they still open their own target, not the post. */}
          <div className="px-4">
            <Text text={post.content} />
          </div>

          {/* Media */}
          <div onClick={stopPropagation}>
            <PostMedia post={post} />
          </div>

          {/* Quoted Post */}
          <div className="px-4" onClick={stopPropagation}>
            {quotedPost && quotedUser && (
              <Card
                className="
              hover:bg-background/50 transition py-4
            "
                onClick={() =>
                  handleCardClick(`/${quotedUser.username}/${quotedPost.id}`)
                }
              >
                <CardContent className="space-y-3 px-0">
                  <div
                    className="flex justify-between items-center px-4"
                    onClick={stopPropagation}
                  >
                    <PostIdDate user={quotedUser} post={quotedPost} />
                  </div>

                  <div className="px-4" onClick={stopPropagation}>
                    <Text text={quotedPost.content} />
                  </div>

                  <div onClick={stopPropagation}>
                    <PostMedia post={quotedPost} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {post.linkPreview?.url && !quotedPost && (
            <a
              // className="mx-4"
              href={post.linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopPropagation}
            >
              <Card className="overflow-hidden transition mx-4 py-0">
                <div className="flex items-center !py-0">
                  {post.linkPreview.image && (
                    <div
                      className="w-28 h-20 px-2 flex-shrink-0"
                      style={{
                        backgroundColor: fallbackColorFromSrc(
                          post.linkPreview.image
                        ),
                      }}
                    >
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

                  {post.linkPreview.url && (
                    <div className="px-4">
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
                      {post.linkPreview.url && (
                        <p className="text-[11px] text-primary">
                          {safeGetHostname(post.linkPreview.url)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </a>
          )}

          {/* Reactions */}
          <div className="px-4 mt-4" onClick={stopPropagation}>
            {user && (
              <Reactions user={user} post={post} optimistic={optimistic} />
            )}
          </div>
        </CardContent>
      </Card>
    </LazyLoadComponent>
  );
};

export default PostCard;
