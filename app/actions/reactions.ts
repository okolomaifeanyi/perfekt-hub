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
  const engagementRef = postRef.collection("engagements").doc(userId);

  let recipientUid: string | null = null;
  let action: "send" | "delete" | null = null;
  let oldType: "like" | "dislike" | null = null;

  const updatedCounts = await firestoreAdmin.runTransaction(
    async transaction => {
      const [engagementDoc, postDoc] = await Promise.all([
        transaction.get(engagementRef),
        transaction.get(postRef),
      ]);

      if (!postDoc.exists) throw new Error("❌ Post not found");

      const postData = postDoc.data();
      recipientUid = postData?.userId || null;

      const counts = postData?.reactionCounts || {};
      const current = engagementDoc.data() || {};

      const currentType: "like" | "dislike" | null = current.liked
        ? "like"
        : current.disliked
        ? "dislike"
        : null;

      oldType = currentType;
      const newCounts = { ...counts };

      if (currentType === type) {
        // toggle off
        transaction.update(engagementRef, {
          [type === "like" ? "liked" : "disliked"]: false,
          lastEngagedAt: FieldValue.serverTimestamp(),
        });

        newCounts[type] = Math.max((newCounts[type] || 0) - 1, 0);
        transaction.update(postRef, {
          [`reactionCounts.${type}`]: newCounts[type],
        });
        action = "delete";
      } else {
        // toggle on
        transaction.set(
          engagementRef,
          {
            liked: type === "like",
            disliked: type === "dislike",
            lastEngagedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        if (currentType) {
          newCounts[currentType] = Math.max(
            (newCounts[currentType] || 0) - 1,
            0
          );
          transaction.update(postRef, {
            [`reactionCounts.${currentType}`]: newCounts[currentType],
          });
        }

        newCounts[type] = (newCounts[type] || 0) + 1;
        transaction.update(postRef, {
          [`reactionCounts.${type}`]: newCounts[type],
        });

        action = "send";
      }

      return newCounts;
    }
  );

  // 🔔 notifications outside txn
  if (recipientUid && action && recipientUid !== userId) {
    if (action === "delete" && oldType) {
      await deleteNotification({
        recipientUid,
        actorUid: userId,
        type: oldType,
      });
    } else if (action === "send") {
      if (oldType) {
        await deleteNotification({
          recipientUid,
          actorUid: userId,
          type: oldType,
        });
      }
      await sendNotification({
        recipientUid,
        actorUid: userId,
        type,
        postId,
      });
    }
  }

  return updatedCounts;
}


export async function addUniqueView(postId: string, userId: string) {
  if (!userId) return;

  const postRef = firestoreAdmin.collection("posts").doc(postId);
  const engagementRef = postRef.collection("engagements").doc(userId);

  const snap = await engagementRef.get();

  if (!snap.exists || !snap.data()?.viewed) {
    await engagementRef.set(
      {
        viewed: true,
        viewedAt: FieldValue.serverTimestamp(),
        lastEngagedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await postRef.update({
      viewCount: FieldValue.increment(1),
    });
  }
}
