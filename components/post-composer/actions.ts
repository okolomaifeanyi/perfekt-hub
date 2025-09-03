// /app/actions/notifyChainUsers.ts
"use server";

import { sendNotification } from "@/app/actions/notifications";
import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";


export async function notifyChainUsers(
  parentPostId: string,
  sender: { uid: string; username: string }
): Promise<void> {
  const notifiedUserIds = new Set<string>();
  const batch = firestoreAdmin.batch();

  let currentId = parentPostId;

  while (currentId) {
    const parentSnap = await firestoreAdmin.doc(`posts/${currentId}`).get();
    if (!parentSnap.exists) break;

    const parentData = parentSnap.data();
    const recipientId = parentData?.userId;
    if (!recipientId) break;

    if (recipientId !== sender.uid && !notifiedUserIds.has(recipientId)) {
      const notifRef = firestoreAdmin
        .collection(`users/${recipientId}/notifications`)
        .doc();

      batch.set(notifRef, {
        toUserId: recipientId,
        fromUser: {
          id: sender.uid,
          username: sender.username,
        },
        postId: parentSnap.id,
        type: "reply",
        message: `@${sender.username} replied to your post.`,
        read: false,
        createdAt: Timestamp.now(),
      });

      notifiedUserIds.add(recipientId);
    }

    currentId = parentData?.parentPostId;
  }

  await batch.commit();
}

export async function sendPost({
  text,
  media,
  user,
  parentPostId = null,
  quotePostId = null,
}: {
  text: string;
  media: { src: string; type: string }[];
  user: { uid: string; username: string; photoURL?: string; fullName?: string };
  parentPostId?: string | null;
  quotePostId?: string | null;
}): Promise<string> {
  if (!user || !text.trim()) throw new Error("User or text is missing");

  const mediaPayload = media.map(item => ({
    src: item.src,
    type: item.type,
  }));

  const postData = {
    userId: user.uid,
    username: user.username,
    content: text.trim(),
    media: mediaPayload,
    createdAt: Timestamp.now(),
    userPhotoURL: user.photoURL || "",
    userFullName: user.fullName || "",
    parentPostId: parentPostId || "",
    quotePostId: quotePostId || "",
    replyCount: 0,
    quoteCount: 0,
  };

  const batch = firestoreAdmin.batch();
  const postRef = firestoreAdmin.collection("posts").doc();

  // 1. Save the new post
  batch.set(postRef, postData);

  // 2. If reply → increment parent's replyCount
  if (parentPostId) {
    const parentRef = firestoreAdmin.collection("posts").doc(parentPostId);
    batch.update(parentRef, {
      replyCount: FieldValue.increment(1),
    });
  }

  // 3. If quote → increment quoted post’s quoteCount
  if (quotePostId) {
    const quotedRef = firestoreAdmin.collection("posts").doc(quotePostId);
    batch.update(quotedRef, {
      quoteCount: FieldValue.increment(1),
    });
  }

  // Commit batched writes
  await batch.commit();

  // 🔔 Notify participants in reply chain
  if (parentPostId) {
    await notifyChainUsers(parentPostId, {
      uid: user.uid,
      username: user.username,
    });
  }

  // 🔔 Notify quoted post’s owner
  if (quotePostId) {
    const quotedPostSnap = await firestoreAdmin
      .collection("posts")
      .doc(quotePostId)
      .get();

    if (quotedPostSnap.exists) {
      const quotedPost = quotedPostSnap.data();
      if (quotedPost?.userId !== user.uid) {
        await sendNotification({
          recipientUid: quotedPost?.userId,
          actorUid: user.uid,
          type: "quote",
          postId: postRef.id,
          extra: { quotePostId },
        });
      }
    }
  }

  return postRef.id;
}

