"use client";

import { useEffect, useState } from "react";
import {
  onSnapshot,
  query,
  where,
  collection,
  FirestoreError,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/lib/store/useUserStore";

/**
 * Custom hook to track the number of unread notifications
 * for the currently authenticated user.
 */
export function useUnreadNotificationsCount(): number {
  const [count, setCount] = useState(0);
  const { user } = useUserStore();

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        setCount(snapshot.size);
      },
      (error: FirestoreError) => {
        console.error("Failed to fetch unread notifications:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return count;
}
