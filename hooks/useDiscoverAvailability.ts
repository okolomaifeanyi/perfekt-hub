"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/useUserStore";
import { getSuggestedMatches, getTopSavedPosts } from "@/app/actions/discover";
import { listUpcomingEvents } from "@/app/actions/events";
import { listProductsPage } from "@/app/actions/posts";

export type DiscoverAvailability = {
  events: boolean;
  saves: boolean;
  match: boolean;
  marketplace: boolean;
};

const EMPTY: DiscoverAvailability = { events: false, saves: false, match: false, marketplace: false };

// Drives the nav bar's extra Events/Saves/Match/Marketplace links, shown
// only once each actually has something in it — an empty-state nav link
// invites a click into nothing.
export function useDiscoverAvailability(): DiscoverAvailability {
  const currentUser = useUserStore(state => state.user);
  const [availability, setAvailability] = useState<DiscoverAvailability>(EMPTY);

  useEffect(() => {
    let active = true;

    // Marketplace listings aren't scoped to an account, so they're worth
    // checking even for a signed-out visitor.
    void listProductsPage({ offset: 0, sortMode: "time", limit: 1 })
      .then(items => {
        if (active) setAvailability(prev => ({ ...prev, marketplace: items.length > 0 }));
      })
      .catch(() => {});

    if (!currentUser?.uid) {
      setAvailability(prev => ({ ...prev, events: false, saves: false, match: false }));
      return;
    }

    void listUpcomingEvents(1)
      .then(items => {
        if (active) setAvailability(prev => ({ ...prev, events: items.length > 0 }));
      })
      .catch(() => {});

    void getTopSavedPosts(1)
      .then(items => {
        if (active) setAvailability(prev => ({ ...prev, saves: items.length > 0 }));
      })
      .catch(() => {});

    void getSuggestedMatches(currentUser.uid, 1)
      .then(items => {
        if (active) setAvailability(prev => ({ ...prev, match: items.length > 0 }));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  return availability;
}
