"use server";

import { cookies } from "next/headers";
import { sendNotification } from "@/app/actions/notifications";
import { scheduleEngagementScoreUpdate } from "@/app/actions/reactions";
import { firestoreAdmin } from "@/lib/supabase";
import {
  extractLinks,
  fetchMetadata,
  isSafeLink,
  resolveNativePost,
} from "@/lib/links";
import { extractMentionUsernames } from "@/lib/rich-text.mjs";
import { LinkPreviewType, PostProps } from "@/lib/types";
import { Timestamp } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { canRunPostBackgroundJobs } from "@/lib/supabase/post-jobs.mjs";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { getUserByUsername } from "@/lib/utils";

async function withSupabaseRequestContext<T>(
  callback: () => Promise<T>
): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  // The @supabase/ssr server client initializes its session lazily
  // (skipAutoInitialize), so no JWT is attached until an auth method runs and
  // every query before that executes as the `anon` role. Hydrate it first so
  // RLS sees the real user.
  await supabase.auth.getUser();

  return runWithSupabaseClient(supabase, callback);
}

export async function notifyChainUsers(
  parentPostId: string,
  sender: { uid: string; username: string }
): Promise<void> {
  const notifiedUserIds = new Set<string>();

  let currentId = parentPostId;

  while (currentId) {
    const parentSnap = await firestoreAdmin.doc(`posts/${currentId}`).get();
    if (!parentSnap.exists()) break;

    const parentData = parentSnap.data();
    const recipientId = parentData?.userId;
    if (!recipientId) break;

    if (recipientId !== sender.uid && !notifiedUserIds.has(recipientId)) {
      await sendNotification({
        recipientUid: recipientId,
        actorUid: sender.uid,
        type: "reply",
        postId: parentSnap.id,
        extra: {
          message: `@${sender.username} replied to your post.`,
        },
      });

      notifiedUserIds.add(recipientId);
    }

    currentId = parentData?.parentPostId;
  }
}

async function notifyMentionedUsers({
  content,
  sender,
  postId,
}: {
  content: string;
  sender: { uid: string; username: string };
  postId: string;
}): Promise<void> {
  const mentionUsernames = Array.from(new Set(extractMentionUsernames(content))).filter(
    username => username !== sender.username.toLowerCase()
  );

  if (mentionUsernames.length === 0) {
    return;
  }

  const mentionRecipients = await Promise.all(
    mentionUsernames.map(async username => getUserByUsername(username))
  );

  await Promise.all(
    mentionRecipients
      .filter((recipient): recipient is NonNullable<typeof recipient> => Boolean(recipient?.uid))
      .map(recipient =>
        sendNotification({
          recipientUid: recipient.uid,
          actorUid: sender.uid,
          type: "mention",
          postId,
          extra: {
            message: `@${sender.username} mentioned you.`,
          },
        })
      )
  );
}

export async function sendPost({
  text,
  media,
  user,
  parentPostId = null,
  quotePostId = null,
  postType = "text",
}: {
  text: string;
  media: { src: string; type: "video" | "image" }[];
  user: { uid: string; username: string; photoURL?: string; fullName?: string };
  parentPostId?: string | null;
  quotePostId?: string | null;
  linkPreview?: LinkPreviewType;
  postType?: "text" | "poll" | "product";
}): Promise<PostProps> {
  if (!user || (!text.trim() && media.length === 0)) {
    throw new Error("User or content is missing");
  }

  const { uid } = await getUserFromSession();
  if (!uid || uid !== user.uid) {
    throw new Error("Unauthorized");
  }

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

  return withSupabaseRequestContext(async () => {
    const postRef = firestoreAdmin.collection("posts").doc();

    const postData = {
      id: postRef.id,
      userId: user.uid,
      username: user.username,
      content: text.trim(),
      content_lowercase: text.trim().toLowerCase(),
      media: mediaPayload,
      createdAt: Timestamp.now(),
      userPhotoURL: user.photoURL || "",
      userFullName: user.fullName || "",
      parentPostId: parentPostId || "",
      quotePostId: quotePostId || "",
      replyCount: 0,
      quoteCount: 0,
      linkPreview: linkPreview || {},
      postType,
    };

    const batch = firestoreAdmin.batch();
    batch.set(postRef, postData);

    if (parentPostId) {
      const engagementRef = firestoreAdmin
        .collection("posts")
        .doc(parentPostId)
        .collection("engagements")
        .doc(user.uid);

      batch.set(
        engagementRef,
        {
          replied: true,
          lastEngagedAt: Timestamp.now(),
        },
        { merge: true }
      );
    }

    if (quotePostId) {
      const engagementRef = firestoreAdmin
        .collection("posts")
        .doc(quotePostId)
        .collection("engagements")
        .doc(user.uid);

      batch.set(
        engagementRef,
        {
          quoted: true,
          lastEngagedAt: Timestamp.now(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    if (canRunPostBackgroundJobs()) {
      if (parentPostId) {
        await scheduleEngagementScoreUpdate(parentPostId);
      }

      if (quotePostId) {
        await scheduleEngagementScoreUpdate(quotePostId);
      }
    }

    if (parentPostId) {
      await notifyChainUsers(parentPostId, {
        uid: user.uid,
        username: user.username,
      });
    }

    if (quotePostId) {
      const quotedPostSnap = await firestoreAdmin
        .collection("posts")
        .doc(quotePostId)
        .get();

      if (quotedPostSnap.exists()) {
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

    await notifyMentionedUsers({
      content: text,
      sender: {
        uid: user.uid,
        username: user.username,
      },
      postId: postRef.id,
    });

    return {
      ...postData,
      createdAt: postData.createdAt.toDate(),
      linkPreview: postData.linkPreview || {},
    } as PostProps;
  });
}
