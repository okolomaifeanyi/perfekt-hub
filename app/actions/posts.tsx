// app/actions/deletePost.ts
"use server";

import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { deleteChildrenPosts } from "./util";

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
