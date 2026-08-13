import { firestoreAdmin } from "@/lib/supabase";
import {
  FieldValue,
  type DocumentReference,
} from "@/lib/supabase";
import { deleteNotification, sendNotification } from "./notifications";
import { canRunPostBackgroundJobs } from "@/lib/supabase/post-jobs.mjs";
import { runReactionNotificationSideEffects } from "@/lib/reaction-notifications.mjs";

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

      if (!postDoc.exists()) throw new Error("❌ Post not found");

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

  // ✅ Recalculate engagementScore after successful transaction
  await scheduleEngagementScoreUpdate(postId);

  // 🔔 notifications outside txn
  await runReactionNotificationSideEffects({
    recipientUid,
    actorUid: userId,
    userId,
    action,
    oldType,
    type,
    postId,
    sendNotification,
    deleteNotification,
  });

  return updatedCounts;
}

export async function addUniqueView(postId: string, userId: string) {
  if (!userId) return;

  const postRef = firestoreAdmin.collection("posts").doc(postId);
  const engagementRef = postRef.collection("engagements").doc(userId);

  const snap = await engagementRef.get();

  if (!snap.exists() || !snap.data()?.viewed) {
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

    // ✅ Update engagement score
    await scheduleEngagementScoreUpdate(postId);
  }
}

/**
 * 🧮 Engagement score formula — consistent with your backfill script.
 */
function calculateEngagementScore(data: {
  replyCount?: number;
  quoteCount?: number;
  reactionCounts?: {
    like?: number;
    dislike?: number;
    view?: number;
  };
}) {
  const replies = data.replyCount ?? 0;
  const quotes = data.quoteCount ?? 0;
  const likes = data.reactionCounts?.like ?? 0;
  const dislikes = data.reactionCounts?.dislike ?? 0;
  const views = data.reactionCounts?.view ?? 0;

  // Tuned weights
  const score = replies * 6 + quotes * 5 + likes * 4 + views * 1 - dislikes * 2;

  return Math.round(score);
}

/**
 * 🔁 Recalculate & update engagementScore for a given post.
 */
export async function updateEngagementScore(
  postRef: DocumentReference
) {
  const snap = await postRef.get();
  if (!snap.exists()) return;

  const data = snap.data()!;
  const newScore = calculateEngagementScore({
    replyCount: data.replyCount,
    quoteCount: data.quoteCount,
    reactionCounts: data.reactionCounts,
  });

  await postRef.update({
    engagementScore: newScore,
    engagementUpdatedAt: FieldValue.serverTimestamp(),
  });

  return newScore;
}

/**
 * In-memory debounce store for engagement updates.
 * Key = postId, Value = timeout handle.
 */
const pendingUpdates = new Map<string, NodeJS.Timeout>();

// same calculateEngagementScore function from before

/**
 * ⚡ Debounced engagementScore updater (memoized)
 */
export async function scheduleEngagementScoreUpdate(
  postId: string,
  delay = 2000 // 2s debounce window
) {
  if (!canRunPostBackgroundJobs()) {
    return;
  }

  // If already scheduled, clear the timer
  if (pendingUpdates.has(postId)) {
    clearTimeout(pendingUpdates.get(postId)!);
  }

  // Set a new timer
  const timeout = setTimeout(async () => {
    pendingUpdates.delete(postId);
    const postRef = firestoreAdmin.collection("posts").doc(postId);
    const snap = await postRef.get();

    if (!snap.exists()) return;
    const data = snap.data()!;
    const newScore = calculateEngagementScore({
      replyCount: data.replyCount,
      quoteCount: data.quoteCount,
      reactionCounts: data.reactionCounts,
    });

    await postRef.update({
      engagementScore: newScore,
      engagementUpdatedAt: FieldValue.serverTimestamp(),
    });
  }, delay);

  pendingUpdates.set(postId, timeout);
}

