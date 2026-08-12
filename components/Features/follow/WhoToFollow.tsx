// components/WhoToFollow.tsx
"use client";

import { useUserStore } from "@/lib/store/useUserStore";
import MyAvatar from "@/components/feed/post/MyAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { H2 } from "@/components/Typography";
import { useEffect, useState } from "react";
// import Name from "@/components/feed/post/Name";
import ConnectDropdown from "@/components/Connect";
import { RotateCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkIcon } from "@heroicons/react/24/solid";
import UserCard from "@/components/UserCard";

interface WhoToFollowProps {
  fullPage?: boolean;
  compact?: boolean;
  className?: string;
}

export default function WhoToFollow({
  fullPage = false,
  compact = false,
  className = "",
}: WhoToFollowProps) {
  const {
    user: currentUser,
    suggestions,
    rotateVisibleSuggestions,
    fetchSmartSuggestions,
  } = useUserStore();

  const [page, setPage] = useState(1);
  const [hasFetched, setHasFetched] = useState(false);
  const ITEMS_PER_PAGE = fullPage ? 6 : 3;
  const showRotate = !fullPage && !compact;

  // Load on first login
  useEffect(() => {
    if (currentUser?.uid && suggestions.length === 0 && !hasFetched) {
      void fetchSmartSuggestions().finally(() => setHasFetched(true));
    }
  }, [currentUser?.uid, suggestions.length, fetchSmartSuggestions, hasFetched]);

  // Reset page when suggestions list changes
  useEffect(() => {
    setPage(1);
  }, [suggestions]);

  // --- CORRECT PAGINATION ---
  const start = fullPage ? (page - 1) * ITEMS_PER_PAGE : 0;
  const end = fullPage ? page * ITEMS_PER_PAGE : ITEMS_PER_PAGE;
  const displayed = suggestions.slice(start, end);
  const hasMore = end < suggestions.length;

  if (!currentUser) return null;

  // EMPTY STATE — distinguish "still fetching" from "fetched, found no one",
  // since always showing a loading spinner here reads as permanently stuck
  // once the search has actually completed with zero candidates (e.g. a
  // small/new network where everyone is already connected).
  if (suggestions.length === 0) {
    if (compact) return null;

    if (!hasFetched) {
      return (
        <Card className={`p-4 ${className}`}>
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Users className="w-6 h-6" />
            <p className="text-center">Finding new people for you...</p>
            <Skeleton className="h-8 w-32 mt-2" />
          </div>
        </Card>
      );
    }

    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Users className="w-6 h-6" />
          <p className="text-center">
            No new suggestions right now — check back as more people join.
          </p>
        </div>
      </Card>
    );
  }

  // ALL SEEN → AUTO-REFRESH (handled in store)
  if (displayed.length === 0 && !hasMore) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Users className="w-6 h-6" />
          <p className="text-center">Loading fresh suggestions...</p>
          <Skeleton className="h-8 w-32 mt-2" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={`space-y-2 ${compact ? "py-3!" : "py-4"} ${className}`}>
      
        <CardHeader className="flex justify-between items-center my-0!">
          <CardTitle
            className={"text-2xl font-bold flex items-center gap-x-2"}
          >
            <LinkIcon className="size-5" /> {fullPage ? "Connect with people" : "Connect"}
          </CardTitle>
          {showRotate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={rotateVisibleSuggestions}
              aria-label="Refresh suggestions"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
    
      <CardContent className={`${compact ? "px-1" : ""}`}>
        {/* Users */}
        <ul className={`space-y-5 ${compact ? "px-2" : ""}`}>
          {displayed.map(u => (
            <li key={u.uid} className="flex justify-between items-center">
              <UserCard user={u}>
              <div className="flex items-center gap-2">
                <MyAvatar
                  username={u.username}
                  fullName={u.fullName}
                  photoURL={u.photoURL}
                  size={compact ? 35 : 45}
                />

                <div className="flex flex-col items-start">
                  {u.fullName && <strong className={compact ? "text-xs" : "text-sm"}>{u.fullName}</strong>}
                  <strong className="text-gray-500 font-normal text-xs">
                    @{u.username}
                  </strong>
                </div>
                </div>
                </UserCard>
              <ConnectDropdown targetUid={u.uid} />
            </li>
          ))}
        </ul>

        {/* Show More */}
        {fullPage && hasMore && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setPage(p => p + 1)}
          >
            Show More ({suggestions.length - end} left)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
