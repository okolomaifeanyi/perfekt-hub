"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  onSnapshot,
  query,
  where,
  collection,
  orderBy,
  limit,
  startAfter,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
  getDoc,
} from "@/lib/supabase";
import { db } from "@/lib/supabase";
import { useUserStore } from "@/lib/store/useUserStore";
import { Notification } from "@/lib/types";
import { getSupabaseToken } from "@/lib/utils";
import { fetchUnreadNotificationCount } from "@/lib/notification-count-api.mjs";

export function useUnreadNotificationsCount(): number {
  const [count, setCount] = useState(0);
  const { user, authReady } = useUserStore();

  useEffect(() => {
    if (!authReady || !user?.uid) {
      setCount(0);
      return;
    }

    let active = true;

    const loadCount = async () => {
      try {
        const accessToken = await getSupabaseToken();
        const nextCount = await fetchUnreadNotificationCount({ accessToken });
        if (active) {
          setCount(nextCount);
        }
      } catch {
        if (active) {
          setCount(0);
        }
      }
    };

    void loadCount();
    const interval = setInterval(() => {
      void loadCount();
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [authReady, user?.uid]);

  return count;
}

const PAGE_SIZE = 10;

// type Filter = "all" | "mentions" | "unread";

// helper: convert type -> readable message
function getNotificationMessage(n: Notification): string {
  switch (n.type) {
    case "follow":
      return `started following you`;
    case "friendRequest":
      return `sent you a friend request`;
    case "acceptRequest":
      return `accepted your friend request`;
    case "like":
      return `liked your post`;
    case "dislike":
      return `disliked your post`;
    case "comment":
      return `commented on your post`;
    case "reply":
      return `replied to your post`;
    case "mention":
      return `mentioned you in a post`;
    case "quote":
      return `quoted your post`;
    default:
      return `did something`;
  }
}

export function useNotifications(
  filter: "all" | "mentions" | "unread" = "all"
) {
  const { user, authReady } = useUserStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // persistent user cache across renders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userCache = useRef(new Map<string, any>());

  // fetch user profile once
  const fetchUser = async (uid: string) => {
    if (userCache.current.has(uid)) return userCache.current.get(uid);
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      userCache.current.set(uid, data);
      return data;
    }
    return null;
  };

  // build query depending on filter
  const buildQuery = useCallback(
    (after?: QueryDocumentSnapshot<DocumentData> | null) => {
      if (!user?.uid) return null;

      let q = query(
        collection(db, "notifications"),
        where("recipientUid", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (filter === "mentions") {
        q = query(
          collection(db, "notifications"),
          where("recipientUid", "==", user.uid),
          where("type", "==", "mention"),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
      } else if (filter === "unread") {
        q = query(
          collection(db, "notifications"),
          where("recipientUid", "==", user.uid),
          where("read", "==", false),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
      }

      if (after) {
        q = query(q, startAfter(after));
      }

      return q;
    },
    [user?.uid, filter]
  );

  // enrich notifications with actor + timestamp conversion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichNotifications = async (snap: any) => {
    const docs = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      snap.docs.map(async (d: any) => {
        const data = d.data();
        let actor = null;
        if (data.actorUid) {
          actor = await fetchUser(data.actorUid);
        }
        const notification: Notification = {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt,
          actor,
        };
        return {
          ...notification,
          message: getNotificationMessage(notification), // <- attach readable message
        };
      })
    );
    return docs;
  };

  // real-time listener for initial + updates
  useEffect(() => {
    if (!authReady || !user?.uid) {
      setNotifications([]);
      setLastDoc(null);
      setHasMore(false);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const q = buildQuery();
    if (!q) return;

    const unsubscribe = onSnapshot(
      q,
      async snap => {
        if (!snap.empty) {
          const docs = await enrichNotifications(snap);
          setNotifications(docs);
          setLastDoc(snap.docs[snap.docs.length - 1]);
          setHasMore(snap.docs.length === PAGE_SIZE);
        } else {
          setNotifications([]);
          setHasMore(false);
        }
        setLoading(false);
      },
      err => {
        console.error("Error fetching notifications:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.uid, filter, buildQuery]);

  // manual "load more" (still uses getDocs, not live updates for next pages)
  const loadMore = useCallback(async () => {
    if (!authReady || !user?.uid || !lastDoc || !hasMore) return;
    setLoadingMore(true);

    try {
      const q = buildQuery(lastDoc);
      if (!q) return;

      const snap = await getDocs(q);
      if (!snap.empty) {
        const docs = await enrichNotifications(snap);
        setNotifications(prev => [...prev, ...docs]);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more notifications:", err);
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.uid, lastDoc, hasMore, buildQuery]);

  // mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    if (!authReady || !user?.uid) return;

    try {
      const ref = doc(db, "notifications", id);
      await updateDoc(ref, { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }, [authReady, user?.uid]);

  // mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!authReady || !user?.uid || notifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.read) {
          const ref = doc(db, "notifications", n.id);
          batch.update(ref, { read: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }, [authReady, user?.uid, notifications]);

  return {
    notifications,
    loading,
    error,
    loadMore,
    loadingMore,
    hasMore,
    markAsRead,
    markAllAsRead,
  };
}
