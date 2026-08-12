export function buildNotificationDocId({
  recipientUid,
  actorUid,
  type,
  postId = "",
}) {
  return [
    "notification",
    recipientUid,
    actorUid,
    type,
    postId,
  ]
    .map(segment => encodeURIComponent(String(segment)))
    .join(":");
}
