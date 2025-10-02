import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { sendNotification, deleteNotification } from "./notifications";
import { FieldValue } from "firebase-admin/firestore";

const usersRef = firestoreAdmin.collection("users");

/**
 * ---------------------------
 * FOLLOW SYSTEM
 * ---------------------------
 */
export async function followUser(currentUid: string, targetUid: string) {
  const followingRef = usersRef.doc(`${currentUid}/following/${targetUid}`);
  const followerRef = usersRef.doc(`${targetUid}/followers/${currentUid}`);

  await firestoreAdmin.runTransaction(async tx => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [followingDoc, followerDoc] = await Promise.all([
      tx.get(followingRef),
      tx.get(followerRef),
    ]);

    if (!followingDoc.exists) {
      tx.set(followingRef, { followedAt: Date.now() });
      tx.set(followerRef, { followedAt: Date.now() });
      tx.update(usersRef.doc(currentUid), {
        followingCount: FieldValue.increment(1),
      });
      tx.update(usersRef.doc(targetUid), {
        followersCount: FieldValue.increment(1),
      });
    }
  });

  // Notifications = non-critical → run outside transaction
  await sendNotification({
    recipientUid: targetUid,
    actorUid: currentUid,
    type: "follow",
  });

  return { status: "following" };
}

export async function unfollowUser(currentUid: string, targetUid: string) {
  const followingRef = usersRef.doc(`${currentUid}/following/${targetUid}`);
  const followerRef = usersRef.doc(`${targetUid}/followers/${currentUid}`);

  await firestoreAdmin.runTransaction(async tx => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [followingDoc, followerDoc] = await Promise.all([
      tx.get(followingRef),
      tx.get(followerRef),
    ]);

    if (followingDoc.exists) {
      tx.delete(followingRef);
      tx.delete(followerRef);
      tx.update(usersRef.doc(currentUid), {
        followingCount: FieldValue.increment(-1),
      });
      tx.update(usersRef.doc(targetUid), {
        followersCount: FieldValue.increment(-1),
      });
    }
  });

  await deleteNotification({
    recipientUid: targetUid,
    actorUid: currentUid,
    type: "follow",
  });

  return { status: "none" };
}

export async function removeFollower(currentUid: string, followerUid: string) {
  const followerRef = usersRef.doc(`${currentUid}/followers/${followerUid}`);
  const followingRef = usersRef.doc(`${followerUid}/following/${currentUid}`);

  await firestoreAdmin.runTransaction(async tx => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [followerDoc, followingDoc] = await Promise.all([
      tx.get(followerRef),
      tx.get(followingRef),
    ]);

    if (followerDoc.exists) {
      tx.delete(followerRef);
      tx.delete(followingRef);
      tx.update(usersRef.doc(currentUid), {
        followersCount: FieldValue.increment(-1),
      });
      tx.update(usersRef.doc(followerUid), {
        followingCount: FieldValue.increment(-1),
      });
    }
  });

  await deleteNotification({
    recipientUid: currentUid,
    actorUid: followerUid,
    type: "follow",
  });

  return { status: "none" };
}

/**
 * ---------------------------
 * FRIEND REQUESTS
 * ---------------------------
 */
export async function sendFriendRequest(currentUid: string, targetUid: string) {
  const sentRef = usersRef.doc(`${currentUid}/friendRequestsSent/${targetUid}`);
  const receivedRef = usersRef.doc(
    `${targetUid}/friendRequestsReceived/${currentUid}`
  );

  await firestoreAdmin.runTransaction(async tx => {
    const [sentDoc, receivedDoc] = await Promise.all([
      tx.get(sentRef),
      tx.get(receivedRef),
    ]);

    if (!sentDoc.exists && !receivedDoc.exists) {
      const now = Date.now();
      tx.set(sentRef, { from: currentUid, to: targetUid, createdAt: now });
      tx.set(receivedRef, { from: currentUid, to: targetUid, createdAt: now });
    }
  });

  await sendNotification({
    recipientUid: targetUid,
    actorUid: currentUid,
    type: "friendRequest",
  });

  return { status: "requested" };
}

export async function cancelFriendRequest(
  currentUid: string,
  targetUid: string
) {
  const sentRef = usersRef.doc(`${currentUid}/friendRequestsSent/${targetUid}`);
  const receivedRef = usersRef.doc(
    `${targetUid}/friendRequestsReceived/${currentUid}`
  );

  await firestoreAdmin.runTransaction(async tx => {
    tx.delete(sentRef);
    tx.delete(receivedRef);
  });

  await deleteNotification({
    recipientUid: targetUid,
    actorUid: currentUid,
    type: "friendRequest",
  });

  return { status: "none" };
}

export async function declineFriendRequest(
  currentUid: string,
  requesterUid: string
) {
  const receivedRef = usersRef.doc(
    `${currentUid}/friendRequestsReceived/${requesterUid}`
  );
  const sentRef = usersRef.doc(
    `${requesterUid}/friendRequestsSent/${currentUid}`
  );

  await firestoreAdmin.runTransaction(async tx => {
    tx.delete(receivedRef);
    tx.delete(sentRef);
  });

  await deleteNotification({
    recipientUid: requesterUid,
    actorUid: currentUid,
    type: "friendRequest",
  });

  return { status: "none" };
}

/**
 * ---------------------------
 * FRIENDSHIP
 * ---------------------------
 */
export async function acceptFriendRequest(
  currentUid: string,
  requesterUid: string
) {
  const receivedRef = usersRef.doc(
    `${currentUid}/friendRequestsReceived/${requesterUid}`
  );
  const sentRef = usersRef.doc(
    `${requesterUid}/friendRequestsSent/${currentUid}`
  );

  const currentFriendRef = usersRef.doc(
    `${currentUid}/friends/${requesterUid}`
  );
  const requesterFriendRef = usersRef.doc(
    `${requesterUid}/friends/${currentUid}`
  );

  // clean up any follow/follower relation
  const followingRef = usersRef.doc(`${currentUid}/following/${requesterUid}`);
  const followerRef = usersRef.doc(`${requesterUid}/followers/${currentUid}`);
  const reverseFollowingRef = usersRef.doc(
    `${requesterUid}/following/${currentUid}`
  );
  const reverseFollowerRef = usersRef.doc(
    `${currentUid}/followers/${requesterUid}`
  );

  const since = Date.now();

  await firestoreAdmin.runTransaction(async tx => {
    tx.set(currentFriendRef, { since, initiatedBy: requesterUid });
    tx.set(requesterFriendRef, { since, initiatedBy: requesterUid });

    tx.delete(receivedRef);
    tx.delete(sentRef);

    tx.delete(followingRef);
    tx.delete(followerRef);
    tx.delete(reverseFollowingRef);
    tx.delete(reverseFollowerRef);

    tx.update(usersRef.doc(currentUid), {
      friendsCount: FieldValue.increment(1),
      followersCount: FieldValue.increment(-1),
      followingCount: FieldValue.increment(-1),
    });
    tx.update(usersRef.doc(requesterUid), {
      friendsCount: FieldValue.increment(1),
      followersCount: FieldValue.increment(-1),
      followingCount: FieldValue.increment(-1),
    });
  });

  await sendNotification({
    recipientUid: requesterUid,
    actorUid: currentUid,
    type: "acceptRequest",
  });

  return { status: "friends" };
}

export async function unfriendUser(currentUid: string, targetUid: string) {
  const currentUserFriendRef = usersRef.doc(
    `${currentUid}/friends/${targetUid}`
  );
  const targetUserFriendRef = usersRef.doc(
    `${targetUid}/friends/${currentUid}`
  );

  await firestoreAdmin.runTransaction(async tx => {
    tx.delete(currentUserFriendRef);
    tx.delete(targetUserFriendRef);

    tx.update(usersRef.doc(currentUid), {
      friendsCount: FieldValue.increment(-1),
    });
    tx.update(usersRef.doc(targetUid), {
      friendsCount: FieldValue.increment(-1),
    });
  });

  await deleteNotification({
    recipientUid: targetUid,
    actorUid: currentUid,
    type: "friendRequest",
  });

  return { status: "none" };
}
