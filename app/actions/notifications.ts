import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { NotificationInput } from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";

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

  const notificationRef = firestoreAdmin.collection("notifications").doc();

  const payload = {
    recipientUid,
    actorUid,
    type: normalizeType(type),
    postId: postId || null,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    ...extra,
  };

  await notificationRef.set(payload);
}

export async function deleteNotification({
  recipientUid,
  actorUid,
  type,
}: {
  recipientUid: string;
  actorUid: string;
  type: NotificationInput["type"];
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

  const snapshot = await firestoreAdmin
    .collection("notifications")
    .where("recipientUid", "==", recipientUid)
    .where("actorUid", "==", actorUid)
    .where("type", "==", normalized)
    .get();

  if (snapshot.empty) return;

  const batch = firestoreAdmin.batch();
  snapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}
