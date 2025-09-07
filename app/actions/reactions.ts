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

  console.log("🚀 toggleLikeDislikeAdmin called", { postId, userId, type });

  let recipientUid: string | null = null;
  let action: "send" | "delete" | null = null;
  let oldType: "like" | "dislike" | null = null;

  const updatedCounts = await firestoreAdmin.runTransaction(
    async transaction => {
      const [reactionDoc, postDoc] = await Promise.all([
        transaction.get(reactionRef),
        transaction.get(postRef),
      ]);

      if (!postDoc.exists) throw new Error("❌ Post not found");

      const postData = postDoc.data();
      recipientUid = postData?.userId || null;

      console.log("📌 Post data", {
        authorId: recipientUid,
        counts: postData?.reactionCounts,
      });

      const counts = postData?.reactionCounts || {};
      const currentReaction: "like" | "dislike" | null = reactionDoc.exists
        ? reactionDoc.data()?.type
        : null;

      oldType = currentReaction;
      console.log("📌 Current reaction:", currentReaction);

      const newCounts = { ...counts };

      if (currentReaction === type) {
        console.log("🗑️ Undoing same reaction:", type);

        transaction.delete(reactionRef);
        newCounts[type] = Math.max((newCounts[type] || 0) - 1, 0);
        transaction.update(postRef, {
          [`reactionCounts.${type}`]: newCounts[type],
        });
        action = "delete";
      } else {
        console.log("✨ Adding/switching reaction", {
          from: currentReaction,
          to: type,
        });

        transaction.set(reactionRef, {
          type,
          createdAt: FieldValue.serverTimestamp(),
        });

        if (currentReaction) {
          newCounts[currentReaction] = Math.max(
            (newCounts[currentReaction] || 0) - 1,
            0
          );
          transaction.update(postRef, {
            [`reactionCounts.${currentReaction}`]: newCounts[currentReaction],
          });
        }

        newCounts[type] = (newCounts[type] || 0) + 1;
        transaction.update(postRef, {
          [`reactionCounts.${type}`]: newCounts[type],
        });

        action = "send";
      }

      console.log("✅ New reaction counts:", newCounts);
      console.log("📌 Action decided:", action);

      return newCounts;
    }
  );

  console.log("📌 After transaction:", {
    recipientUid,
    action,
    oldType,
    updatedCounts,
  });

  // 🔔 Send/delete notifications OUTSIDE transaction
  if (recipientUid && action && recipientUid !== userId) {
    if (action === "delete" && oldType) {
      console.log("🔔 Deleting notification", { type: oldType });
      await deleteNotification({
        recipientUid,
        actorUid: userId,
        type: oldType,
      });
    } else if (action === "send") {
      if (oldType) {
        console.log("🔔 Switching → delete old notification first", {
          oldType,
        });
        await deleteNotification({
          recipientUid,
          actorUid: userId,
          type: oldType,
        });
      }

      console.log("🔔 Sending new notification", { type, postId });
      await sendNotification({
        recipientUid,
        actorUid: userId,
        type,
        postId,
      });
    }
  } else {
    console.log("⚠️ No notification sent", { recipientUid, action });
  }

  return updatedCounts;
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
