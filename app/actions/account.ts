"use server";

import { firestoreAdmin, authAdmin } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { deleteChildrenPosts } from "./util";

async function deleteUserPost(postId: string, userId: string): Promise<void> {
  const db = firestoreAdmin;
  const postRef = db.doc(`posts/${postId}`);
  const snap = await postRef.get();
  if (!snap.exists) return;

  const post = snap.data()!;
  if (post.userId !== userId) return;

  const batch = db.batch();

  // Decrement parent replyCount
  if (post.parentPostId) {
    const parentRef = db.doc(`posts/${post.parentPostId}`);
    batch.update(parentRef, { replyCount: FieldValue.increment(-1) });
  }

  // Decrement quoted post quoteCount
  if (post.quotePostId) {
    const quotedRef = db.doc(`posts/${post.quotePostId}`);
    batch.update(quotedRef, { quoteCount: FieldValue.increment(-1) });
  }

  // Delete engagements
  const engSnap = await postRef.collection("engagements").get();
  for (const eng of engSnap.docs) {
    batch.delete(eng.ref);
  }

  batch.delete(postRef);
  await batch.commit();

  await deleteChildrenPosts(postId);
}

/**
 * DELETE USER ACCOUNT – FULL CLEANUP
 */
export async function deleteAccountAction(userId: string): Promise<void> {
  if (!userId) throw new Error("userId is required");

  const db = firestoreAdmin;
  const auth = authAdmin;
  const userRef = db.doc(`users/${userId}`);

  // === 1. Delete all user posts ===
  const postsSnap = await db
    .collection("posts")
    .where("userId", "==", userId)
    .get();
  for (const post of postsSnap.docs) {
    await deleteUserPost(post.id, userId);
  }

  // === 2. Start batch for user doc + subcollections + inverse relationships ===
  const batch = db.batch();

  const subcollections = [
    "friends",
    "following",
    "followers",
    "notifications",
    "friendRequestsSent",
    "friendRequestsReceived",
  ];

  // Delete all subcollections
  for (const sub of subcollections) {
    const snap = await userRef.collection(sub).get();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
  }

  // === 3. Clean inverse relationships ===
  // For each person this user follows → remove from their followers
  const followingSnap = await userRef.collection("following").get();
  for (const doc of followingSnap.docs) {
    const targetId = doc.id;
    const inverseRef = db.doc(`users/${targetId}/followers/${userId}`);
    batch.delete(inverseRef);
  }

  // For each follower → remove from their following
  const followersSnap = await userRef.collection("followers").get();
  for (const doc of followersSnap.docs) {
    const followerId = doc.id;
    const inverseRef = db.doc(`users/${followerId}/following/${userId}`);
    batch.delete(inverseRef);
  }

  // === 4. Decrement user's postsCount (if exists) ===
  batch.update(userRef, {
    postsCount: FieldValue.increment(-postsSnap.size),
  });

  // === 5. Delete user document ===
  batch.delete(userRef);

  await batch.commit();

  // === 6. Delete Firebase Auth user ===
  try {
    await auth.deleteUser(userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code !== "auth/user-not-found") throw error;
  }
}
