// lib/actions/friends.ts
import { dbAdmin, firestoreAdmin } from "@/lib/firebaseAdmin";
import { NotificationInput } from "@/lib/types";
import { Timestamp } from "firebase-admin/firestore";

export async function followUser(currentUid: string, targetUid: string) {
  const followingRef = firestoreAdmin.doc(
    `users/${currentUid}/following/${targetUid}`
  );
  const followerRef = firestoreAdmin.doc(
    `users/${targetUid}/followers/${currentUid}`
  );

  await Promise.all([
    followingRef.set({ followedAt: Date.now() }),
    followerRef.set({ followedAt: Date.now() }),
  ]);
}

export async function unfollowUser(currentUid: string, targetUid: string) {
  const followingRef = firestoreAdmin.doc(
    `users/${currentUid}/following/${targetUid}`
  );
  const followerRef = firestoreAdmin.doc(
    `users/${targetUid}/followers/${currentUid}`
  );

  await Promise.all([followingRef.delete(), followerRef.delete()]);
}

export async function sendFriendRequest(currentUid: string, targetUid: string) {
  const sentRef = firestoreAdmin.doc(
    `users/${currentUid}/friendRequestsSent/${targetUid}`
  );
  const receivedRef = firestoreAdmin.doc(
    `users/${targetUid}/friendRequestsReceived/${currentUid}`
  );
  const followRef = firestoreAdmin.doc(
    `users/${targetUid}/followers/${currentUid}`
  );

  await Promise.all([
    sentRef.set({ createdAt: Date.now() }),
    receivedRef.set({ createdAt: Date.now() }),
    followRef.set({ followedAt: Date.now() }),
  ]);
}

export async function unfriendUser(currentUid: string, targetUid: string) {
  const currentUserFriendRef = firestoreAdmin.doc(
    `users/${currentUid}/friends/${targetUid}`
  );
  const targetUserFriendRef = firestoreAdmin.doc(
    `users/${targetUid}/friends/${currentUid}`
  );

  await Promise.all([
    currentUserFriendRef.delete(),
    targetUserFriendRef.delete(),
  ]);
}

export async function acceptFriendRequest(
  currentUid: string,
  requesterUid: string
) {
  const receivedRef = firestoreAdmin.doc(
    `users/${currentUid}/friendRequestsReceived/${requesterUid}`
  );
  const sentRef = firestoreAdmin.doc(
    `users/${requesterUid}/friendRequestsSent/${currentUid}`
  );

  const currentUserFriendRef = firestoreAdmin.doc(
    `users/${currentUid}/friends/${requesterUid}`
  );
  const requesterFriendRef = firestoreAdmin.doc(
    `users/${requesterUid}/friends/${currentUid}`
  );

  await Promise.all([
    currentUserFriendRef.set({ createdAt: Date.now() }),
    requesterFriendRef.set({ createdAt: Date.now() }),

    receivedRef.delete(),
    sentRef.delete(),
  ]);
}

export async function cancelFriendRequest(
  currentUid: string,
  targetUid: string
) {
  const sentRef = firestoreAdmin.doc(
    `users/${currentUid}/friendRequestsSent/${targetUid}`
  );
  const receivedRef = firestoreAdmin.doc(
    `users/${targetUid}/friendRequestsReceived/${currentUid}`
  );
  const followRef = firestoreAdmin.doc(
    `users/${targetUid}/followers/${currentUid}`
  );

  await Promise.all([
    sentRef.delete(),
    receivedRef.delete(),
    followRef.delete(),
  ]);
}

export async function declineFriendRequest(
  currentUid: string,
  requesterUid: string
) {
  const receivedRef = firestoreAdmin.doc(
    `users/${currentUid}/friendRequestsReceived/${requesterUid}`
  );
  const sentRef = firestoreAdmin.doc(
    `users/${requesterUid}/friendRequestsSent/${currentUid}`
  );
  const followRef = firestoreAdmin.doc(
    `users/${currentUid}/followers/${requesterUid}`
  );

  await Promise.all([
    receivedRef.delete(),
    sentRef.delete(),
    followRef.delete(),
  ]);
}

export async function removeFollower(currentUid: string, followerUid: string) {
  const followerRef = firestoreAdmin.doc(
    `users/${currentUid}/followers/${followerUid}`
  );
  const followingRef = firestoreAdmin.doc(
    `users/${followerUid}/following/${currentUid}`
  );

  await Promise.all([followerRef.delete(), followingRef.delete()]);
}

export async function sendNotification({
  recipientUid,
  actorUid,
  type,
  postId,
  extra = {},
}: NotificationInput) {
  if (recipientUid === actorUid) return;

  const notificationRef = firestoreAdmin.collection("notifications").doc();

  const payload = {
    recipientUid,
    actorUid,
    type,
    postId: postId || null,
    read: false,
    createdAt: Timestamp.now(),
    ...extra,
  };

  await notificationRef.set(payload);
}

export async function toggleLikeDislikeAdmin({
  postId,
  userId,
  type,
}: {
  postId: string;
  userId: string;
  type: "like" | "dislike";
}) {
  const postRef = dbAdmin.collection("posts").doc(postId);
  const reactionRef = postRef.collection("reactions").doc(userId);

  return dbAdmin.runTransaction(async transaction => {
    const reactionDoc = await transaction.get(reactionRef);
    const postDoc = await transaction.get(postRef);

    if (!postDoc.exists) throw new Error("Post not found");

    const counts = postDoc.data()?.reactionCounts || {};
    const currentReaction = reactionDoc.exists
      ? reactionDoc.data()?.type
      : null;

    if (currentReaction === type) {
      // remove reaction
      transaction.delete(reactionRef);
      transaction.update(postRef, {
        [`reactionCounts.${type}`]: Math.max((counts[type] || 1) - 1, 0),
      });
    } else {
      // set new reaction
      transaction.set(reactionRef, { type, createdAt: Date.now() });
      if (currentReaction) {
        // switch reaction
        transaction.update(postRef, {
          [`reactionCounts.${currentReaction}`]: Math.max(
            (counts[currentReaction] || 1) - 1,
            0
          ),
          [`reactionCounts.${type}`]: (counts[type] || 0) + 1,
        });
      } else {
        // new reaction
        transaction.update(postRef, {
          [`reactionCounts.${type}`]: (counts[type] || 0) + 1,
        });
      }
    }
  });
}
