// app/actions/deletePost.ts
"use server";

import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Recursively delete replies & quotes
 */
async function deleteChildrenPosts(parentId: string): Promise<void> {
  const db = firestoreAdmin;

  const [repliesSnap, quotesSnap] = await Promise.all([
    db.collection("posts").where("parentPostId", "==", parentId).get(),
    db.collection("posts").where("quotePostId", "==", parentId).get(),
  ]);

  const children = [...repliesSnap.docs, ...quotesSnap.docs];
  if (children.length === 0) return;

  const batch = db.batch();
  for (const child of children) {
    batch.delete(child.ref);
  }
  await batch.commit();

  // Recurse in parallel
  await Promise.all(children.map(child => deleteChildrenPosts(child.id)));
}

/**
 * Delete a post + update all counters + user postsCount
 */
export async function deletePostAction(
  postId: string,
  userId: string
): Promise<void> {
  if (!postId || !userId) {
    throw new Error("postId and userId are required");
  }

  const db = firestoreAdmin;
  const postRef = db.doc(`posts/${postId}`);
  const postSnap = await postRef.get();

  if (!postSnap.exists) {
    throw new Error("Post not found");
  }

  const post = postSnap.data()!;
  if (post.userId !== userId) {
    throw new Error("You can only delete your own posts");
  }

  const batch = db.batch();

  // 1. Decrement parent replyCount
  if (post.parentPostId) {
    const parentRef = db.doc(`posts/${post.parentPostId}`);
    batch.update(parentRef, { replyCount: FieldValue.increment(-1) });
  }

  // 2. Decrement quoted post quoteCount
  if (post.quotePostId) {
    const quotedRef = db.doc(`posts/${post.quotePostId}`);
    batch.update(quotedRef, { quoteCount: FieldValue.increment(-1) });
  }

  // 3. Delete engagements
  const engSnap = await postRef.collection("engagements").get();
  for (const eng of engSnap.docs) {
    batch.delete(eng.ref);
  }

  // 4. Delete the post
  batch.delete(postRef);

  // 5. Decrement user's postsCount
  const userRef = db.doc(`users/${userId}`);
  batch.update(userRef, { postsCount: FieldValue.increment(-1) });

  // Commit all in one atomic batch
  await batch.commit();

  // 6. Recursively delete children (replies & quotes)
  await deleteChildrenPosts(postId);
}
