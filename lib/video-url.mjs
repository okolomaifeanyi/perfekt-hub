export function buildCanonicalPostUrl(username, postId) {
  return `/${username}/${postId}`;
}

export function buildVideoPostUrl(username, postId) {
  return `/${username}/${postId}/video`;
}
