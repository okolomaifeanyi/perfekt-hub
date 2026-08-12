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

  const rankedCandidates = rankVideoCandidates(
    feedPosts
      .filter(post => post?.id && post.id !== currentPost.id && hasVideoMedia(post))
      .map(deriveViewerCandidate)
  ).map(candidate => candidate.post ?? candidate);

  return refillVideoQueue({
    currentQueue: [currentPost],
    candidates: rankedCandidates,
    targetSize,
  });
}
