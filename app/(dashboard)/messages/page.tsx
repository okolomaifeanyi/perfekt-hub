"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/lib/store/useUserStore";
import { H1, P } from "@/components/Typography";
import Conversation from "./Conversation";
import { ConversationProps } from "@/lib/types";

export default function InboxPage() {
  const { user } = useUserStore();
  const [conversations, setConversations] = useState<ConversationProps[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, snap => {
      const list: ConversationProps[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ConversationProps);
      });
      setConversations(list);
    });

    return () => unsub();
  }, [user]);

  if (!user) return <div className="p-4">Please login</div>;

  return (
    <div className="p-4">
      <H1 className="text-xl font-bold mb-4">Messages</H1>
      <div className="flex flex-col gap-3">
        {conversations.length === 0 && (
          <P className="text-gray-500">No conversations yet</P>
        )}
        {conversations.map(conv => {
          const other =
            conv.participants.find(p => p !== user.uid) || "Unknown";
          return <Conversation key={conv.id} otherUid={other} conv={conv} />;
        })}
      </div>
    </div>
  );
}
