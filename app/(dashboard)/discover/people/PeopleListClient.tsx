"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import FollowCard from "@/components/FollowCard";
import { SortToggle, type ListSortMode } from "@/components/discover/SortToggle";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUserStore } from "@/lib/store/useUserStore";
import { listPeoplePage } from "@/app/actions/discover";
import type { UserProps } from "@/lib/types";

function PersonSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <div className="size-11 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function PeopleListClient() {
  const currentUid = useUserStore(state => state.user?.uid);
  const [sortMode, setSortMode] = useState<ListSortMode>("time");

  const { items, loading, loadingMore, hasMore, sentinelRef } = useInfiniteList<UserProps>({
    sortMode,
    pageSize: 20,
    fetchPage: async ({ offset, sortMode: mode, limit }) => {
      if (!currentUid) return [];
      return listPeoplePage({ currentUid, offset, sortMode: mode as ListSortMode, limit });
    },
  });

  return (
    <div className="space-y-4">
      <SortToggle value={sortMode} onChange={setSortMode} engagementLabel="Most followed" />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <PersonSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="py-8">
          <CardContent className="text-center text-sm text-muted-foreground">
            No one to show yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(person => (
            <FollowCard key={person.uid} user={person} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">You&apos;ve reached the end.</p>
      )}
    </div>
  );
}
