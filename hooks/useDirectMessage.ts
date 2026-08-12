"use client";

import { db } from "@/lib/supabase";
import { doc, getDoc, serverTimestamp, setDoc } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUserStore } from "@/lib/store/useUserStore";
import { canUsePrivateData } from "@/lib/private-data-access.mjs";
import {
  buildDirectConversationId,
  parseDirectConversationId,
} from "@/lib/conversation-utils.mjs";

export function useDirectMessage() {
  const { user, authReady } = useUserStore();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startDM = async (targetUid: string) => {
    if (!canUsePrivateData(authReady, user?.uid)) {
      toast.error("Please sign in to message");
      return;
    }

    setLoading(true);

    try {
      const currentUserUid = user?.uid ?? "";
      const conversationId = buildDirectConversationId(
        currentUserUid,
        targetUid
      );
      const participants =
        parseDirectConversationId(conversationId) ?? [
          currentUserUid,
          targetUid,
        ];

      const ref = doc(db, "conversations", conversationId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          participants,
          createdAt: serverTimestamp(),
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
        });
      }

      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error("Direct message start failed:", error);
      toast.error("Could not start conversation");
    } finally {
      setLoading(false);
    }
  };

  return { startDM, loading };
}
