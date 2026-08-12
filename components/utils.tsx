import { db } from "@/lib/supabase";
import { doc, setDoc, deleteDoc, getDoc } from "@/lib/supabase";
import { getCompactTimeAgo as getCompactTimeAgoShared } from "@/lib/time-format.mjs";

export function getCompactTimeAgo(date: Date): string {
  return getCompactTimeAgoShared(date);
}

export async function followUser(currentUid: string, targetUid: string) {
  if (currentUid === targetUid) return;

  const followingRef = doc(db, `users/${currentUid}/following/${targetUid}`);
  const followerRef = doc(db, `users/${targetUid}/followers/${currentUid}`);

  await Promise.all([
    setDoc(followingRef, { followedAt: Date.now() }),
    setDoc(followerRef, { followedAt: Date.now() }),
  ]);
}

export async function unfollowUser(currentUid: string, targetUid: string) {
  const followingRef = doc(db, `users/${currentUid}/following/${targetUid}`);
  const followerRef = doc(db, `users/${targetUid}/followers/${currentUid}`);

  await Promise.all([deleteDoc(followingRef), deleteDoc(followerRef)]);
}

export async function isFollowing(currentUid: string, targetUid: string) {
  const docRef = doc(db, `users/${currentUid}/following/${targetUid}`);
  const snapshot = await getDoc(docRef);
  return snapshot.exists();
}

export async function checkFriendStatus(
  currentUid: string,
  targetUid: string
): Promise<"none" | "requested" | "friends"> {
  const [friendDoc, requestDoc] = await Promise.all([
    getDoc(doc(db, `users/${currentUid}/friends/${targetUid}`)),
    getDoc(doc(db, `users/${currentUid}/friendRequestsSent/${targetUid}`)),
  ]);

  if (friendDoc.exists()) return "friends";
  if (requestDoc.exists()) return "requested";
  return "none";
}

export async function sendFriendRequest(currentUid: string, targetUid: string) {
  const sentRef = doc(
    db,
    `users/${currentUid}/friendRequestsSent/${targetUid}`
  );
  const receivedRef = doc(
    db,
    `users/${targetUid}/friendRequestsReceived/${currentUid}`
  );
  const followRef = doc(db, `users/${targetUid}/followers/${currentUid}`);

  await Promise.all([
    setDoc(sentRef, { createdAt: Date.now() }),
    setDoc(receivedRef, { createdAt: Date.now() }),
    setDoc(followRef, { followedAt: Date.now() }), // auto-follow
  ]);
}

export async function cancelFriendRequest(
  currentUid: string,
  targetUid: string
) {
  const sentRef = doc(
    db,
    `users/${currentUid}/friendRequestsSent/${targetUid}`
  );
  const receivedRef = doc(
    db,
    `users/${targetUid}/friendRequestsReceived/${currentUid}`
  );
  const followRef = doc(db, `users/${targetUid}/followers/${currentUid}`);

  await Promise.all([
    deleteDoc(sentRef),
    deleteDoc(receivedRef),
    deleteDoc(followRef), // unfollow on rejection/cancel
  ]);
}

export async function acceptFriendRequest(
  currentUid: string,
  requesterUid: string
) {
  const sentRef = doc(
    db,
    `users/${requesterUid}/friendRequestsSent/${currentUid}`
  );
  const receivedRef = doc(
    db,
    `users/${currentUid}/friendRequestsReceived/${requesterUid}`
  );

  const currentUserFriendRef = doc(
    db,
    `users/${currentUid}/friends/${requesterUid}`
  );
  const requesterFriendRef = doc(
    db,
    `users/${requesterUid}/friends/${currentUid}`
  );

  const currentUserFollowerRef = doc(
    db,
    `users/${currentUid}/followers/${requesterUid}`
  );
  const requesterFollowerRef = doc(
    db,
    `users/${requesterUid}/followers/${currentUid}`
  );

  await Promise.all([
    deleteDoc(sentRef),
    deleteDoc(receivedRef),
    setDoc(currentUserFriendRef, { since: Date.now() }),
    setDoc(requesterFriendRef, { since: Date.now() }),
    setDoc(currentUserFollowerRef, { followedAt: Date.now() }), // requester follows current user
    setDoc(requesterFollowerRef, { followedAt: Date.now() }), // current user follows requester
  ]);
}

export async function declineFriendRequest(
  currentUid: string,
  requesterUid: string
) {
  const sentRef = doc(
    db,
    `users/${requesterUid}/friendRequestsSent/${currentUid}`
  );
  const receivedRef = doc(
    db,
    `users/${currentUid}/friendRequestsReceived/${requesterUid}`
  );
  const followRef = doc(db, `users/${currentUid}/followers/${requesterUid}`);

  await Promise.all([
    deleteDoc(sentRef),
    deleteDoc(receivedRef),
    deleteDoc(followRef), // requester unfollows if rejected
  ]);
}
