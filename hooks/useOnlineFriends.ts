"use client";

import { useEffect, useMemo, useState } from "react";
import { db, doc, onSnapshot } from "@/lib/supabase";
import { useUserConnections } from "@/hooks/UserConnections";
import { UserProps } from "@/lib/types";

export type FriendPreview = UserProps & {
  status: "online" | "recently-active" | "offline";
};

function getFriendStatus(user: UserProps): FriendPreview["status"] {
  if (user.online) return "online";

  const lastSeen = user.lastSeen;
  if (!lastSeen) return "offline";

  const seenAt =
    lastSeen instanceof Date
      ? lastSeen
      : "toDate" in lastSeen
        ? lastSeen.toDate()
        : new Date(lastSeen);

  const minutesSinceSeen = (Date.now() - seenAt.getTime()) / 60000;
  if (Number.isFinite(minutesSinceSeen) && minutesSinceSeen <= 15) {
    return "recently-active";
  }

  return "offline";
}

// Shared between the desktop Aside sidebar (hidden below the lg breakpoint)
// and any mobile-visible equivalent, so both surfaces show the same online
// friends without duplicating the fetch/sort logic.
//
// Subscribes per-friend via onSnapshot rather than a one-shot fetch — a
// one-shot fetch only reflects each friend's presence at the moment this
// hook first ran, so anyone who came online afterward would keep reading
// "offline" until something else happened to remount this hook.
export function useOnlineFriends(limit = 6) {
  const { friends } = useUserConnections();
  const [profiles, setProfiles] = useState<Record<string, UserProps>>({});

  const watchedIds = friends.slice(0, limit);
  // Array identity from .slice() changes every render even when the
  // underlying ids don't, so the effect keys off this joined string instead
  // — otherwise the subscriptions would tear down and reconnect constantly.
  const watchedKey = watchedIds.join(",");

  useEffect(() => {
    const ids = watchedKey ? watchedKey.split(",") : [];
    if (ids.length === 0) {
      setProfiles({});
      return;
    }

    const unsubs = ids.map(friendId =>
      onSnapshot(doc(db, "users", friendId), snap => {
        setProfiles(prev => {
          if (!snap.exists()) {
            if (!(friendId in prev)) return prev;
            const next = { ...prev };
            delete next[friendId];
            return next;
          }
          return {
            ...prev,
            [friendId]: { uid: snap.id, ...snap.data() } as UserProps,
          };
        });
      })
    );

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [watchedKey]);

  const friendPreviews = useMemo(() => {
    return watchedIds
      .map(id => profiles[id])
      .filter((profile): profile is UserProps => Boolean(profile))
      .map(profile => ({
        ...profile,
        status: getFriendStatus(profile),
      }))
      .sort((left, right) => {
        const order = { online: 0, "recently-active": 1, offline: 2 } as const;
        return order[left.status] - order[right.status];
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, watchedKey]);

  const activeCount = useMemo(
    () => friendPreviews.filter(f => f.status !== "offline").length,
    [friendPreviews]
  );

  const friendsLabel = useMemo(() => {
    if (activeCount === 0) return "No active friends yet";
    return activeCount === 1 ? "1 friend active" : `${activeCount} friends active`;
  }, [activeCount]);

  return { friendPreviews, friendsLabel };
}
