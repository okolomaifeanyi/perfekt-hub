// /app/actions/notifyChainUsers.ts
"use server";

import { sendNotification } from "@/app/actions/notifications";
import { scheduleEngagementScoreUpdate } from "@/app/actions/reactions";
import { firestoreAdmin } from "@/lib/firebaseAdmin";
import {
  extractLinks,
  fetchMetadata,
  isSafeLink,
  resolveNativePost,
} from "@/lib/links";
import { LinkPreviewType, PostProps } from "@/lib/types";
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
  media: { src: string; type: "video" | "image" }[];
  user: { uid: string; username: string; photoURL?: string; fullName?: string };
  parentPostId?: string | null;
  quotePostId?: string | null;
  linkPreview?: LinkPreviewType;
}): Promise<PostProps> {
  if (!user || (!text.trim() && media.length === 0))
    throw new Error("User or content is missing");

  // 🔍 Extract and validate links
  const links = extractLinks(text);
  let linkPreview: LinkPreviewType | null = null;

  if (links.length > 0) {
    for (const link of links) {
      const safeResult = await isSafeLink(link);
      if (!safeResult.safe) {
        throw new Error(
          safeResult.reason || "Unsafe or malicious link detected"
        );
      }

      // resolve native post if no manual quotePostId
      if (!quotePostId) {
        const nativePost = await resolveNativePost(link);
        if (nativePost) {
          quotePostId = nativePost.id;
          break;
        }
      }

      if (!linkPreview && !quotePostId) {
        linkPreview = await fetchMetadata(link);
      }
    }
  }

  const mediaPayload = media.map(item => ({
    src: item.src,
    type: item.type,
  }));

  const postRef = firestoreAdmin.collection("posts").doc();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postData: any = {
    id: postRef.id,
    userId: user.uid,
    username: user.username,
    content: text.trim(),
    content_lowercase: text.trim().toLowerCase(), // ← ADD THIS
    media: mediaPayload,
    createdAt: Timestamp.now(),
    userPhotoURL: user.photoURL || "",
    userFullName: user.fullName || "",
    parentPostId: parentPostId || "",
    quotePostId: quotePostId || "",
    replyCount: 0,
    quoteCount: 0,
    linkPreview: linkPreview || {},
  };

  if (linkPreview) {
    postData.linkPreview = linkPreview;
  }

  const batch = firestoreAdmin.batch();

  // 1. Save the new post
  batch.set(postRef, postData);

  // 2. If reply → increment parent's replyCount + add engagement
  if (parentPostId) {
    const parentRef = firestoreAdmin.collection("posts").doc(parentPostId);
    batch.update(parentRef, {
      replyCount: FieldValue.increment(1),
    });

    const engagementRef = parentRef.collection("engagements").doc(user.uid);
    batch.set(
      engagementRef,
      {
        replied: true,
        lastEngagedAt: Timestamp.now(),
      },
      { merge: true }
    );
  }

  // 3. If quote → increment quoted post’s quoteCount + add engagement
  if (quotePostId) {
    const quotedRef = firestoreAdmin.collection("posts").doc(quotePostId);
    batch.update(quotedRef, {
      quoteCount: FieldValue.increment(1),
    });

    const engagementRef = quotedRef.collection("engagements").doc(user.uid);
    batch.set(
      engagementRef,
      {
        quoted: true,
        lastEngagedAt: Timestamp.now(),
      },
      { merge: true }
    );
  }

  // Commit batched writes
  await batch.commit();

  // ✅ Update engagement score of affected posts
  if (parentPostId) {
    await scheduleEngagementScoreUpdate(parentPostId);
  }

  if (quotePostId) {
    await scheduleEngagementScoreUpdate(quotePostId);
  }

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

  return {
    ...postData,
    createdAt: postData.createdAt.toDate(), // Convert Timestamp → Date
    linkPreview: postData.linkPreview || {},
  } as PostProps;
}
