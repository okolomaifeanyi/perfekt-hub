import { firestoreAdmin } from "@/lib/supabase";
import { NotificationInput } from "@/lib/types";
import { FieldValue } from "@/lib/supabase";
import { buildNotificationDocId } from "@/lib/notification-id.mjs";
import { sendPushToUser } from "./notificationPrefs";

const PUSH_CATEGORY_BY_TYPE: Record<string, "likes" | "comments" | "follows"> = {
  like: "likes",
  dislike: "likes",
  reply: "comments",
  comment: "comments",
  mention: "comments",
  quote: "comments",
  follow: "follows",
  friendRequest: "follows",
  acceptRequest: "follows",
};

const PUSH_TITLE_BY_TYPE: Record<string, string> = {
  like: "New like",
  dislike: "New reaction",
  reply: "New reply",
  comment: "New comment",
  mention: "You were mentioned",
  quote: "New quote",
  follow: "New follower",
  friendRequest: "New friend request",
  acceptRequest: "Friend request accepted",
};

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

  // Best-effort — a push failure (no subscription, expired endpoint, VAPID
  // not configured) shouldn't affect the in-app notification that already
  // succeeded above.
  const category = PUSH_CATEGORY_BY_TYPE[normalizeType(type)];
  if (category) {
    try {
      await sendPushToUser(recipientUid, category, {
        title: PUSH_TITLE_BY_TYPE[normalizeType(type)] ?? "New notification",
        body: typeof extra?.message === "string" ? extra.message : "You have a new notification.",
        url: "/notifications",
      });
    } catch (err) {
      console.error("sendPushToUser failed:", err);
    }
  }
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
