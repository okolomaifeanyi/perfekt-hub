"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, Globe, Loader2, Lock, Users } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SortToggle, type ListSortMode } from "@/components/discover/SortToggle";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { joinGroup, listGroupsPage, type GroupProps } from "@/app/actions/groups";
import { useUserStore } from "@/lib/store/useUserStore";

function GroupCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div className="size-11 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function GroupCard({
  group,
  isOwner,
  isDone,
  hasRequested,
  onJoin,
}: {
  group: GroupProps;
  isOwner: boolean;
  isDone: boolean;
  hasRequested: boolean;
  onJoin: () => void;
}) {
  return (
    <Card className="overflow-hidden py-0">
      <Link href={`/discover/groups/${group.id}`} className="block">
        <CardHeader className="pt-4 pb-2 space-y-2">
          <div className="flex items-start gap-3">
            <Avatar className="size-11 shrink-0">
              {group.photoURL && <AvatarImage src={group.photoURL} alt="" />}
              <AvatarFallback className="font-semibold">
                {group.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base hover:underline">{group.name}</CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1 text-[10px] shrink-0">
                  {group.joinPolicy === "open" ? (
                    <Globe className="size-2.5" />
                  ) : (
                    <Lock className="size-2.5" />
                  )}
                  {group.joinPolicy === "open" ? "Open" : "Approval"}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {group.membersCount} member{group.membersCount === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {format(new Date(group.createdAt), "MMM yyyy")}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Link>
      <CardContent className="pb-4 space-y-3">
        {group.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{group.description}</p>
        )}
        {!isOwner && !isDone && !hasRequested && (
          <Button size="sm" onClick={onJoin}>
            {group.joinPolicy === "open" ? "Join" : "Request to join"}
          </Button>
        )}
        {isDone && (
          <Button size="sm" variant="outline" disabled>
            Joined
          </Button>
        )}
        {hasRequested && (
          <Button size="sm" variant="outline" disabled>
            Requested
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function GroupsListClient() {
  const currentUid = useUserStore(state => state.user?.uid);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<ListSortMode>("time");

  const { items: groups, loading, loadingMore, hasMore, sentinelRef } = useInfiniteList<GroupProps>({
    sortMode,
    pageSize: 20,
    fetchPage: ({ offset, sortMode: mode, limit }) =>
      listGroupsPage({ offset, sortMode: mode as ListSortMode, limit }),
  });

  const handleJoin = async (groupId: string) => {
    setJoinedIds(prev => new Set(prev).add(groupId));
    try {
      const result = await joinGroup(groupId);
      if (result.status === "requested") {
        setJoinedIds(prev => { const n = new Set(prev); n.delete(groupId); return n; });
        setRequestedIds(prev => new Set(prev).add(groupId));
        toast.success("Join request sent");
      } else {
        toast.success("Joined group");
      }
    } catch {
      setJoinedIds(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
      toast.error("Failed to join group");
    }
  };

  return (
    <div className="space-y-4">
      <SortToggle value={sortMode} onChange={setSortMode} engagementLabel="Most members" />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <GroupCardSkeleton key={i} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="py-8">
          <CardContent className="text-center text-sm text-muted-foreground">
            No groups yet — be the first to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              isOwner={group.ownerUid === currentUid}
              isDone={joinedIds.has(group.id) || group.ownerUid === currentUid}
              hasRequested={requestedIds.has(group.id)}
              onJoin={() => void handleJoin(group.id)}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!hasMore && groups.length > 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">You&apos;ve reached the end.</p>
      )}
    </div>
  );
}
