// lib/actions/friends.ts
import { firestoreAdmin } from "@/lib/firebaseAdmin";

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
