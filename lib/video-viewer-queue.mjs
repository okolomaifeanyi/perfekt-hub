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
}) {
  if (!hasVideoMedia(currentPost)) {
    return [];
  }

  // Expand the current post first if it has multiple videos
  const expandedCurrent = expandMultiVideoPost(currentPost);

  const rankedCandidates = rankVideoCandidates(
    feedPosts
      .filter(post => post?.id && post.id !== currentPost.id && hasVideoMedia(post))
      .flatMap(expandMultiVideoPost)
      .map(deriveViewerCandidate)
  ).map(candidate => candidate.post ?? candidate);

  return refillVideoQueue({
    currentQueue: expandedCurrent,
    candidates: rankedCandidates,
    targetSize,
  });
}
