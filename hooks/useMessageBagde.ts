import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useUserStore } from "@/lib/store/useUserStore";

export function useMessageBadge() {
  const { user } = useUserStore();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, snap => {
      let total = 0;
      snap.forEach(doc => {
        const data = doc.data();
        total += data.unreadCount?.[user.uid] || 0;
      });
      setCount(total);
    });

    return () => unsub();
  }, [user]);

  return count;
}
