"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export interface User {
  id: string;
  username: string;
  fullName: string;
  photoURL?: string;
}

export function useUser(userId: string | null) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!userId) return;

    const ref = doc(db, "users", userId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setUser({ id: snap.id, ...snap.data() } as User);
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, [userId]);

  return user;
}