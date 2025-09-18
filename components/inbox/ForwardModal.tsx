"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { MessageProps } from "@/lib/types";
import { useUserStore } from "@/lib/store/useUserStore";

interface ForwardModalProps {
  message: MessageProps;
  onClose: () => void;
}

export default function ForwardModal({ message, onClose }: ForwardModalProps) {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);

  // 📨 forward to selected conversation
  const forwardTo = async (conversationId: string, targetUid: string) => {
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(
        collection(db, "conversations", conversationId, "messages"),
        {
          senderId: user.uid,
          text: message.text ?? "",
          media: message.media ?? null,
          forwarded: true,
          originalSender: message.senderId,
          createdAt: serverTimestamp(),
          readBy: [user.uid],
        }
      );

      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: message.text || (message.media ? "📎 Attachment" : ""),
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${user.uid}`]: 0,
        [`unreadCount.${targetUid}`]: increment(1),
      });

      onClose();
    } catch (err) {
      console.error("forward error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>

        <div className="p-2 border rounded bg-muted mb-3 text-sm">
          {message.text || "📎 Attachment"}
        </div>

        {/* TODO: replace with your conversation picker */}
        <Button
          disabled={loading}
          onClick={
            () => forwardTo("some_conversation_id", "target_uid") // hook up your picker
          }
        >
          {loading ? "Forwarding..." : "Forward"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
