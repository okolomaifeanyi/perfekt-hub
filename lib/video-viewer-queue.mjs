import { rankVideoCandidates, refillVideoQueue } from "./video-recommendations.mjs";

function countHashtags(content) {
  if (typeof content !== "string" || content.trim() === "") {
    return 0;
  }

  return (content.match(/(^|\s)#[\p{L}\p{N}_-]+/gu) ?? []).length;
}

export function hasVideoMedia(post) {
  return Boolean(post?.media?.some(media => media?.type === "video"));
}

/**
 * Expand a post with multiple videos into one synthetic entry per video,
 * so each clip gets its own reel slot.
 */
function expandMultiVideoPost(post) {
  const videos = (post.media ?? []).filter(m => m?.type === "video");
  if (videos.length <= 1) return [post];
  return videos.map((vid, i) => ({
    ...post,
    id: i === 0 ? post.id : `${post.id}_v${i}`,
    media: [vid],
  }));
}

function deriveViewerCandidate(post) {
  return {
    ...post,
    watchTime: post.viewCount ?? post.views ?? post.engagementScore ?? 0,
    likes: post.likes ?? post.reactions?.likes ?? 0,
    tags: countHashtags(post.content ?? post.content_lowercase ?? ""),
    quotes: post.quoteCount ?? 0,
    replies: post.replyCount ?? post.comments?.length ?? 0,
    follows: post.authorFollowersCount ?? 0,
  };
}

export function buildVideoViewerQueue({
  currentPost,
  feedPosts,
  targetSize = 12,
  // Per-viewer seed (their uid) so two people looking at the same
  // candidate pool — very likely for public/group videos, which aren't
  // filtered per-user at all — don't get served the identical queue order.
  // See rankVideoCandidates for why this only affects tied candidates.
  seed,
  // The viewer's own uid — never suggest more of the viewer's own videos as
  // "up next" while they're watching, regardless of whose video is current.
  // currentPost itself is always kept even if it's the viewer's own (they
  // navigated there directly), this only filters the candidate pool.
  excludeUid,
}) {
  if (!hasVideoMedia(currentPost)) {
    return [];
  }

  // Expand the current post first if it has multiple videos
  const expandedCurrent = expandMultiVideoPost(currentPost);

  const rankedCandidates = rankVideoCandidates(
    feedPosts
      .filter(post => post?.id && post.id !== currentPost.id && hasVideoMedia(post))
      .filter(post => !excludeUid || post.userId !== excludeUid)
      .flatMap(expandMultiVideoPost)
      .map(deriveViewerCandidate),
    seed
  ).map(candidate => candidate.post ?? candidate);

  return refillVideoQueue({
    currentQueue: expandedCurrent,
    candidates: rankedCandidates,
    targetSize,
  });
}
