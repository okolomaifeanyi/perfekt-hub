import { getFeedAction } from "@/app/actions/feed";
import { buildVideoViewerQueue, hasVideoMedia } from "@/lib/video-viewer-queue.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import VideoViewer from "@/components/feed/post/VideoViewer";

export default async function WatchPage() {
  const { uid } = await getUserFromSession();

  if (!uid) {
    return null;
  }

  const feedPosts = await getFeedAction(uid, 50, null, null, false, "trending");
  const currentPost = feedPosts.find(hasVideoMedia);

  if (!currentPost) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-lg font-medium">No videos yet</p>
        <p className="text-sm text-muted-foreground">
          Videos from posts you follow will show up here.
        </p>
      </div>
    );
  }

  const queue = buildVideoViewerQueue({
    currentPost,
    feedPosts,
    targetSize: 12,
  });

  return (
    <VideoViewer
      currentUsername={currentPost.username || ""}
      currentPost={currentPost}
      queue={queue}
    />
  );
}
