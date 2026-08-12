export function mergeFeedAuthorIds(userId, friendIds, followingIds) {
  return Array.from(
    new Set([
      userId,
      ...friendIds,
      ...followingIds,
    ].filter((id) => typeof id === "string" && id.trim() !== ""))
  );
}
