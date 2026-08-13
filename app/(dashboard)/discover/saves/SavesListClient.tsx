"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SortToggle, type ListSortMode } from "@/components/discover/SortToggle";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { listSavesPage } from "@/app/actions/discover";
import PostCard from "@/app/(dashboard)/[username]/[postId]/components/PostCard";
import type { PostProps } from "@/lib/types";

function PostSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export function SavesListClient() {
  const [sortMode, setSortMode] = useState<ListSortMode>("time");

  const { items, loading, loadingMore, hasMore, sentinelRef } = useInfiniteList<PostProps>({
    sortMode,
    pageSize: 10,
    fetchPage: ({ offset, sortMode: mode, limit }) =>
      listSavesPage({ offset, sortMode: mode as ListSortMode, limit }),
  });

  return (
    <div className="space-y-4">
      <SortToggle value={sortMode} onChange={setSortMode} engagementLabel="Most saved" />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="py-8">
          <CardContent className="text-center text-sm text-muted-foreground">
            No saved posts yet — be the first to save one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(post => (
            <PostCard key={post.id} post={post} isPostPage />
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
