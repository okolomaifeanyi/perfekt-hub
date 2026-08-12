export async function runReactionNotificationSideEffects({
  recipientUid,
  actorUid,
  userId,
  action,
  oldType,
  type,
  postId,
  sendNotification,
  deleteNotification,
}) {
  if (!recipientUid || !action || recipientUid === userId) return;

  try {
    if (action === "delete" && oldType) {
      await deleteNotification({
        recipientUid,
        actorUid,
        type: oldType,
        postId,
      });
      return;
    }

    if (action === "send") {
      if (oldType) {
        await deleteNotification({
          recipientUid,
          actorUid,
          type: oldType,
          postId,
        });
      }

      await sendNotification({
        recipientUid,
        actorUid,
        type,
        postId,
      });
    }
  } catch (error) {
    console.warn("Skipping reaction notification side effects", error);
  }
}
