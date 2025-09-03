import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { deleteNotification, sendNotification } from "./notifications";

export async function toggleLikeDislikeAdmin({
  postId,
  userId,
  type,
}: {
  postId: string;
  userId: string;
  type: "like" | "dislike";
}) {
  const postRef = firestoreAdmin.collection("posts").doc(postId);
  const reactionRef = postRef.collection("reactions").doc(userId);

  return firestoreAdmin.runTransaction(async transaction => {
    const [reactionDoc, postDoc] = await Promise.all([
      transaction.get(reactionRef),
      transaction.get(postRef),
    ]);

    if (!postDoc.exists) throw new Error("Post not found");

    const postData = postDoc.data();
    const recipientUid = postData?.authorId; // make sure your posts store the owner uid
    const counts = postData?.reactionCounts || {};
    const currentReaction: "like" | "dislike" | null = reactionDoc.exists
      ? reactionDoc.data()?.type
      : null;

    const updatedCounts = { ...counts };

    if (currentReaction === type) {
      // 🔄 undo the reaction
      transaction.delete(reactionRef);
      updatedCounts[type] = Math.max((updatedCounts[type] || 0) - 1, 0);

      transaction.update(postRef, {
        [`reactionCounts.${type}`]: updatedCounts[type],
      });

      // 🔔 remove notification
      await deleteNotification({
        recipientUid,
        actorUid: userId,
        type,
      });
    } else {
      // 🔄 set/switch reaction
      transaction.set(reactionRef, {
        type,
        createdAt: FieldValue.serverTimestamp(),
      });

      if (currentReaction) {
        updatedCounts[currentReaction] = Math.max(
          (updatedCounts[currentReaction] || 0) - 1,
          0
        );

        transaction.update(postRef, {
          [`reactionCounts.${currentReaction}`]: updatedCounts[currentReaction],
        });

        // 🔔 remove old notification
        await deleteNotification({
          recipientUid,
          actorUid: userId,
          type: currentReaction,
        });
      }

      updatedCounts[type] = (updatedCounts[type] || 0) + 1;

      transaction.update(postRef, {
        [`reactionCounts.${type}`]: updatedCounts[type],
      });

      if (recipientUid && recipientUid !== userId) {
        await sendNotification({
          recipientUid,
          actorUid: userId,
          type,
          postId,
        });
      } else if (recipientUid === userId) {
        await sendNotification({
          recipientUid,
          actorUid: userId,
          type,
          postId,
          extra: { message: `You ${type}d your own post` },
        });
      }
    }

    return updatedCounts;
  });
}


export async function addUniqueView(postId: string, userId: string) {
  if (!userId) return;

  const postRef = firestoreAdmin.collection("posts").doc(postId);
  const viewRef = postRef.collection("views").doc(userId);

  const viewSnap = await viewRef.get();

  if (!viewSnap.exists) {
    // create view record
    await viewRef.set({ viewedAt: new Date() });

    // atomically increment post viewCount
    await postRef.update({
      viewCount: FieldValue.increment(1),
    });
  }
}
