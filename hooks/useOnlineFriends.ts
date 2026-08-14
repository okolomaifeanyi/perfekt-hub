"use client";

import { useEffect, useMemo, useState } from "react";
import { db, doc, onSnapshot } from "@/lib/supabase";
import { useUserConnections } from "@/hooks/UserConnections";
import { UserProps } from "@/lib/types";
import { getPresenceStatus } from "@/lib/presence.mjs";

export type FriendPreview = UserProps & {
  status: "online" | "recently-active" | "offline";
};

// A friend's own doc only re-fires onSnapshot when THEIR heartbeat writes
// to it — so once they stop (tab closed), this hook would otherwise keep
// showing their last-known status forever instead of aging it down to
// "recently active" then "offline" the way getPresenceStatus intends.
// This ticks a periodic recompute so status decays live for the viewer too.
const STATUS_RECOMPUTE_INTERVAL_MS = 30_000;

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

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), STATUS_RECOMPUTE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const friendPreviews = useMemo(() => {
    return watchedIds
      .map(id => profiles[id])
      .filter((profile): profile is UserProps => Boolean(profile))
      .map(profile => ({
        ...profile,
        status: getPresenceStatus(profile) as FriendPreview["status"],
      }))
      .sort((left, right) => {
        const order = { online: 0, "recently-active": 1, offline: 2 } as const;
        return order[left.status] - order[right.status];
      });
    // tick is intentionally unused in the body — it exists purely to force
    // this memo to recompute on an interval so status ages down over time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, watchedKey, tick]);

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
