// Inside your useDirectMessage.ts file

"use client";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUserStore } from "@/lib/store/useUserStore";

export function useDirectMessage() {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startDM = async (targetUid: string) => {
    if (!user?.uid) return toast.error("Please sign in to message");

    setLoading(true);
    try {
      const currentUserUid = user.uid;
      const participants = [currentUserUid, targetUid].sort();
      const conversationId = participants.join("_");

      const ref = doc(db, "conversations", conversationId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const newConversationData = {
          participants: participants,
          type: "direct",
          createdAt: new Date(),
          createdBy: currentUserUid,
          lastMessage: "",
          lastMessageAt: new Date(),
        };

        // ✅ LOG THE DATA RIGHT BEFORE THE WRITE
        console.log(
          "Attempting to CREATE document with this data:",
          newConversationData
        );
        await setDoc(ref, newConversationData);
      } else {
        console.log("Document already exists. Navigating...");
      }

      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error("Firebase Error:", err);
      toast.error("Could not start conversation");
    } finally {
      setLoading(false);
    }
  };

  return { startDM, loading };
}
