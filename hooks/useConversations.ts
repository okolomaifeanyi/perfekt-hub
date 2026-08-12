"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "@/lib/supabase";
import { db } from "@/lib/supabase";
import { useUserStore } from "@/lib/store/useUserStore";
import { canUsePrivateData } from "@/lib/private-data-access.mjs";
import { ConversationProps } from "@/lib/types";

export function useConversations() {
  const { user, authReady } = useUserStore();
  const [conversations, setConversations] = useState<ConversationProps[]>([]);
  const [loaded, setLoaded] = useState(false);

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
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ConversationProps);
      });
      setConversations(list);
      setLoaded(true);
    });

    return () => unsub();
  }, [authReady, user?.uid]);

  return { conversations, loaded, user, authReady };
}
