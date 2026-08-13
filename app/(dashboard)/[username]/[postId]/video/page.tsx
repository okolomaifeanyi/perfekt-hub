import { notFound } from "next/navigation";

import { getPost } from "@/lib/data";
import { getFeedAction } from "@/app/actions/feed";
import { buildVideoMetadata } from "@/lib/video-metadata.mjs";
import { buildVideoViewerQueue, hasVideoMedia } from "@/lib/video-viewer-queue.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import VideoViewer from "@/components/feed/post/VideoViewer";

type PageProps = {
  params: Promise<{ username: string; postId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { username, postId } = await params;
  const post = await getPost(postId);

  if (!post) {
    return {};
  }

  return buildVideoMetadata({
    username,
    postId,
    title: `${post.userFullName || post.username || username} on Perfekthub`,
    description: post.content || "Watch this video on Perfekthub.",
    image: post.media?.[0]?.src || post.userPhotoURL || "",
  });
}

export default async function VideoPage({ params }: PageProps) {
  const { username, postId } = await params;
  const currentPost = await getPost(postId);

  if (!currentPost || !hasVideoMedia(currentPost)) {
    return notFound();
  }

  const { uid } = await getUserFromSession();
  const feedUserId = uid || currentPost.userId;
  const feedPosts = await getFeedAction(feedUserId, 50, null, null, false, "trending");

  const queue = buildVideoViewerQueue({
    currentPost,
    feedPosts,
    targetSize: 12,
    seed: feedUserId,
  });

  return <VideoViewer currentUsername={username} currentPost={currentPost} queue={queue} />;
}
