"use client";

import { useEffect, useMemo, useState } from "react";
import { getUser } from "@/lib/data";
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
export function useOnlineFriends(limit = 6) {
  const { friends } = useUserConnections();
  const [friendPreviews, setFriendPreviews] = useState<FriendPreview[]>([]);

  useEffect(() => {
    let active = true;

    void (async () => {
      const profiles = await Promise.all(friends.slice(0, limit).map(friendId => getUser(friendId)));
      const previews = profiles
        .filter((profile): profile is UserProps => Boolean(profile))
        .map(profile => ({
          ...profile,
          status: getFriendStatus(profile),
        }))
        .sort((left, right) => {
          const order = { online: 0, "recently-active": 1, offline: 2 } as const;
          return order[left.status] - order[right.status];
        });

      if (active) {
        setFriendPreviews(previews);
      }
    })();

    return () => {
      active = false;
    };
  }, [friends, limit]);

  const friendsLabel = useMemo(() => {
    if (friendPreviews.length === 0) return "No active friends yet";
    return friendPreviews.length === 1 ? "1 friend active" : `${friendPreviews.length} friends active`;
  }, [friendPreviews.length]);

  return { friendPreviews, friendsLabel };
}
