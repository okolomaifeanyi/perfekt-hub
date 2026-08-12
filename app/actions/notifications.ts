import { firestoreAdmin } from "@/lib/supabase";
import { NotificationInput } from "@/lib/types";
import { FieldValue } from "@/lib/supabase";
import { buildNotificationDocId } from "@/lib/notification-id.mjs";

/**
 * Normalize engagement-style booleans into a consistent notification type string.
 */
function normalizeType(type: NotificationInput["type"] | undefined): string {
  if (!type) return "unknown";
  return type; // e.g. "like" | "dislike" | "reply" | "quote" | "view" | "share"
}

export async function sendNotification({
  recipientUid,
  actorUid,
  type,
  postId,
  extra = {},
}: NotificationInput) {
  if (!recipientUid || !actorUid || recipientUid === actorUid) return;

  const notificationRef = firestoreAdmin
    .collection("notifications")
    .doc(
      buildNotificationDocId({
        recipientUid,
        actorUid,
        type,
        postId,
      })
    );

  const payload = {
    recipientUid,
    actorUid,
    type: normalizeType(type),
    postId: postId || null,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    ...extra,
  };

  await notificationRef.set(payload, { merge: true });
}

export async function deleteNotification({
  recipientUid,
  actorUid,
  type,
  postId,
}: {
  recipientUid: string;
  actorUid: string;
  type: NotificationInput["type"];
  postId?: string;
}) {
  if (!recipientUid || !actorUid || !type) {
    console.error("deleteNotification called with missing params", {
      recipientUid,
      actorUid,
      type,
    });
    return;
  }

  const normalized = normalizeType(type);

  const notificationRef = firestoreAdmin
    .collection("notifications")
    .doc(
      buildNotificationDocId({
        recipientUid,
        actorUid,
        type: normalized as NotificationInput["type"],
        postId,
      })
    );

  await notificationRef.delete();
}
