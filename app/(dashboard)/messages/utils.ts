import { doc, updateDoc, arrayUnion, arrayRemove } from "@/lib/supabase";
import { db } from "@/lib/supabase";

export async function toggleReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
  userId: string,
  reacted: boolean
) {
  const ref = doc(db, "conversations", conversationId, "messages", messageId);

  try {
    await updateDoc(ref, {
      [`reactions.${emoji}`]: reacted
        ? arrayRemove(userId) // remove if already reacted
        : arrayUnion(userId), // add if not reacted
    });
  } catch (err) {
    console.error("toggleReaction error:", err);
  }
}
