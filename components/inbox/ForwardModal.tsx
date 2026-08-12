"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/supabase";
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@/lib/supabase";
import { ConversationProps, MessageProps } from "@/lib/types";
import { useUserStore } from "@/lib/store/useUserStore";
import { canUsePrivateData } from "@/lib/private-data-access.mjs";
import { getOtherConversationParticipant } from "@/lib/conversation-utils.mjs";
import { useUser } from "@/hooks/useUser";
import JustAvatar from "@/components/JustAvatar";

interface ForwardModalProps {
  message: MessageProps;
  onClose: () => void;
}

function ForwardConversationRow({
  conversation,
  currentUid,
  onForward,
  disabled,
}: {
  conversation: ConversationProps;
  currentUid: string;
  onForward: (conversation: ConversationProps, targetUid: string) => void;
  disabled: boolean;
}) {
  const targetUid = getOtherConversationParticipant(
    conversation.participants,
    currentUid
  );
  const targetUser = useUser(targetUid);

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
      onClick={() => {
        if (targetUid) onForward(conversation, targetUid);
      }}
      disabled={disabled || !targetUid}
    >
      <JustAvatar
        size={36}
        username={targetUser?.username || targetUid || "user"}
        photoURL={targetUser?.photoURL}
        fullName={targetUser?.fullName}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-medium">
            {targetUser?.fullName || targetUser?.username || "Unknown"}
          </span>
          {conversation.lastMessageAt && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {conversation.lastMessageAt.toDate().toLocaleDateString()}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {conversation.lastMessage || "No messages yet"}
        </p>
      </div>
    </Button>
  );
}

export default function ForwardModal({ message, onClose }: ForwardModalProps) {
  const { user, authReady } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationProps[]>([]);

  useEffect(() => {
    const currentUid = user?.uid ?? "";
    if (!canUsePrivateData(authReady, currentUid)) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, snap => {
      const list: ConversationProps[] = [];
      snap.forEach(document => {
        list.push({ id: document.id, ...document.data() } as ConversationProps);
      });
      setConversations(list);
    });

    return () => unsub();
  }, [authReady, user?.uid]);

  if (!authReady || !user?.uid) {
    return null;
  }

  const forwardTo = async (
    conversation: ConversationProps,
    targetUid: string
  ) => {
    if (!user?.uid || !targetUid) return;

    setLoading(true);
    try {
      await addDoc(
        collection(db, "conversations", conversation.id, "messages"),
        {
          senderId: user.uid,
          text: message.text ?? "",
          ...(message.media ? { media: message.media } : {}),
          forwarded: true,
          originalSender: message.senderId,
          createdAt: serverTimestamp(),
        }
      );

      await updateDoc(doc(db, "conversations", conversation.id), {
        lastMessage: message.text || (message.media ? "Attachment" : ""),
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
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
          <DialogDescription>
            Select a conversation to forward this message.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          {message.text || "Attachment"}
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {conversations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No conversations yet
            </p>
          ) : (
            conversations.map(conversation => (
              <ForwardConversationRow
                key={conversation.id}
                conversation={conversation}
                currentUid={user?.uid ?? ""}
                onForward={forwardTo}
                disabled={loading}
              />
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
