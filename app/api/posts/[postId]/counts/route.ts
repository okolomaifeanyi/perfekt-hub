import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/supabase";
import { getCurrentUid } from "@/app/actions";
import { getQuoteCount, getReplyCount } from "@/lib/data";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const postRef = firestoreAdmin.collection("posts").doc(postId);
  const snap = await postRef.get();

  if (!snap.exists()) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const data = snap.data();

  const uidOrResponse = await getCurrentUid(req);
  if ("status" in uidOrResponse) return uidOrResponse;

  const currentUid = uidOrResponse.uid;

  // default userReaction flags
  const userReaction = {
    liked: false,
    disliked: false,
    commented: false,
    quoted: false,
    viewed: false,
    shared: false,
  };

  // ðŸ‘‡ check if this user has a reaction doc in subcollection
  if (currentUid) {
    const reactionSnap = await postRef
      .collection("reactions")
      .doc(currentUid)
      .get();

    if (reactionSnap.exists()) {
      const reactionData = reactionSnap.data() as { type: "like" | "dislike" };

      if (reactionData.type === "like") userReaction.liked = true;
      if (reactionData.type === "dislike") userReaction.disliked = true;
    }

    // ðŸ‘€ check if user viewed
    const viewSnap = await postRef.collection("views").doc(currentUid).get();

    if (viewSnap.exists()) {
      userReaction.viewed = true;
    }
  }

  const replyCount = await getReplyCount(postId);
  const quoteCount = await getQuoteCount(postId);

  return NextResponse.json({
    replyCount,
    quoteCount,
    likeCount: data?.reactionCounts?.like ?? 0,
    dislikeCount: data?.reactionCounts?.dislike ?? 0,
    viewCount: data?.viewCount ?? 0,
    shareCount: data?.shareCount ?? 0,
    userReaction,
  });
}
