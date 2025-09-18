import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { deleteNotification, sendNotification } from "./notifications";
import { FieldValue } from "firebase-admin/firestore";

function increment(uid: string, field: string, amount: number) {
  return firestoreAdmin.doc(`users/${uid}`).update({
    [field]: FieldValue.increment(amount),
  });
}

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
    increment(currentUid, "followingCount", 1),
    increment(targetUid, "followersCount", 1),
    sendNotification({
      recipientUid: targetUid,
      actorUid: currentUid,
      type: "follow",
    }),
  ]);
}

export async function unfollowUser(currentUid: string, targetUid: string) {
  const followingRef = firestoreAdmin.doc(
    `users/${currentUid}/following/${targetUid}`
  );
  const followerRef = firestoreAdmin.doc(
    `users/${targetUid}/followers/${currentUid}`
  );

  await Promise.all([
    followingRef.delete(),
    followerRef.delete(),
    increment(currentUid, "followingCount", -1),
    increment(targetUid, "followersCount", -1),
    deleteNotification({
      recipientUid: targetUid,
      actorUid: currentUid,
      type: "follow",
    }),
  ]);
}

export async function sendFriendRequest(currentUid: string, targetUid: string) {
  const sentRef = firestoreAdmin.doc(
    `users/${currentUid}/friendRequestsSent/${targetUid}`
  );
  const receivedRef = firestoreAdmin.doc(
    `users/${targetUid}/friendRequestsReceived/${currentUid}`
  );

  await Promise.all([
    sentRef.set({ from: currentUid, to: targetUid, createdAt: Date.now() }),
    receivedRef.set({ from: currentUid, to: targetUid, createdAt: Date.now() }),
    sendNotification({
      recipientUid: targetUid,
      actorUid: currentUid,
      type: "friendRequest",
    }),
  ]);

  return { status: "requested" };
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
    increment(currentUid, "friendsCount", -1),
    increment(targetUid, "friendsCount", -1),
    deleteNotification({
      recipientUid: targetUid,
      actorUid: currentUid,
      type: "friendRequest",
    }),
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

  const currentFriendRef = firestoreAdmin.doc(
    `users/${currentUid}/friends/${requesterUid}`
  );
  const requesterFriendRef = firestoreAdmin.doc(
    `users/${requesterUid}/friends/${currentUid}`
  );

  const since = Date.now();

  await Promise.all([
    currentFriendRef.set({ since, initiatedBy: requesterUid }),
    requesterFriendRef.set({ since, initiatedBy: requesterUid }),
    receivedRef.delete(),
    sentRef.delete(),
    increment(currentUid, "friendsCount", 1),
    increment(requesterUid, "friendsCount", 1),
    sendNotification({
      recipientUid: requesterUid,
      actorUid: currentUid,
      type: "acceptRequest",
    }),
  ]);

  return { status: "friends" };
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
    deleteNotification({
      recipientUid: targetUid,
      actorUid: currentUid,
      type: "friendRequest",
    }),
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
    deleteNotification({
      recipientUid: requesterUid,
      actorUid: currentUid,
      type: "acceptRequest",
    }),
  ]);
}

export async function removeFollower(currentUid: string, followerUid: string) {
  const followerRef = firestoreAdmin.doc(
    `users/${currentUid}/followers/${followerUid}`
  );
  const followingRef = firestoreAdmin.doc(
    `users/${followerUid}/following/${currentUid}`
  );

  await Promise.all([
    followerRef.delete(),
    followingRef.delete(),
    increment(currentUid, "followersCount", -1),
    increment(followerUid, "followingCount", -1),
    deleteNotification({
      recipientUid: currentUid,
      actorUid: followerUid,
      type: "follow",
    }),
  ]);
}
