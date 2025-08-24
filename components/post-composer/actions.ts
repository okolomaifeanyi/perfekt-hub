// /app/actions/notifyChainUsers.ts
"use server";

import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { sendNotification } from "../actions";

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
    parentPostId: parentPostId || "", // for reply chains
    quotePostId: quotePostId || "", // for quoting another post
  };

  const docRef = await firestoreAdmin.collection("posts").add(postData);

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
          postId: docRef.id,
          extra: { quotePostId },
        });
      }
    }
  }

  return docRef.id;
}
