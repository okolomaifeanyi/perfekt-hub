"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/supabase";
import { doc, onSnapshot } from "@/lib/supabase";
import { UserProps } from "@/lib/types";

export function useUser(userId: string | null) {
  const [user, setUser] = useState<UserProps | null>(null);

  useEffect(() => {
    if (!userId) return;

    const ref = doc(db, "users", userId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setUser({ uid: snap.id, ...snap.data() } as UserProps);
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, [userId]);

  return user;
}