import { getFeedAction } from "@/app/actions/feed";
import { buildVideoViewerQueue, hasVideoMedia } from "@/lib/video-viewer-queue.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import VideoViewer from "@/components/feed/post/VideoViewer";
import { createClient } from "@/lib/supabase/server";
import { normalizeReadRow } from "@/lib/supabase/firestore-schema.mjs";
import { PostProps } from "@/lib/types";

export default async function WatchPage() {
  const { uid } = await getUserFromSession();

  if (!uid) {
    return null;
  }

  // Fetch regular feed posts + public group video posts in parallel
  const [feedPosts, groupVideoPosts] = await Promise.all([
    getFeedAction(uid, 50, null, null, false, "trending"),
    fetchPublicGroupVideoPosts(),
  ]);

  // Merge and deduplicate
  const seen = new Set<string>(feedPosts.map(p => p.id));
  const merged = [...feedPosts];
  for (const p of groupVideoPosts) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      merged.push(p);
    }
  }

  const currentPost = merged.find(hasVideoMedia);

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
    feedPosts: merged,
    targetSize: 12,
    seed: uid,
  });

  return (
    <VideoViewer
      currentUsername={currentPost.username || ""}
      currentPost={currentPost}
      queue={queue}
      syncUrlOnScroll={false}
    />
  );
}

async function fetchPublicGroupVideoPosts(): Promise<PostProps[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        groups!inner ( name, defaultpostvisibility )
      `)
      .not("groupid", "is", null)
      .eq("visibility", "public")
      .eq("groups.defaultpostvisibility", "public")
      .order("createdat", { ascending: false })
      .limit(30);

    if (error || !data) return [];

    return data.map(row => {
      const normalized = normalizeReadRow("posts", row);
      // Attach the group name from the join
      normalized.groupName = row.groups?.name ?? null;
      return normalized as unknown as PostProps;
    });
  } catch {
    return [];
  }
}
