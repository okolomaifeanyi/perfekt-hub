"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { UserProps } from "@/lib/types";

export function useUserProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<UserProps | null>(null);

  useEffect(() => {
    if (!uid) return;

    const unsub = onSnapshot(doc(db, "users", uid), snap => {
      if (snap.exists()) {
        setProfile({
          uid: snap.id,
          ...(snap.data() as Omit<UserProps, "uid">),
        });
      }
    });

    return () => unsub();
  }, [uid]);

  return profile;
}
