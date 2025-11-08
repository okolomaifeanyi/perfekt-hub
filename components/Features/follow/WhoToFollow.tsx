// components/WhoToFollow.tsx
"use client";

import { useUserStore } from "@/lib/store/useUserStore";
import MyAvatar from "@/components/feed/post/MyAvatar";
import { Card } from "@/components/ui/card";
import { H2 } from "@/components/Typography";
import { useEffect, useState } from "react";
import Name from "@/components/feed/post/Name";
import ConnectDropdown from "@/components/Connect";
import { RotateCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
    markSuggestionSeen,
  } = useUserStore();

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = fullPage ? 6 : 3;
  const showRotate = !fullPage && !compact;

  // Load on first login
  useEffect(() => {
    if (currentUser?.uid && suggestions.length === 0) {
      fetchSmartSuggestions();
    }
  }, [currentUser?.uid, suggestions.length, fetchSmartSuggestions]);

  // Reset page when suggestions list changes
  useEffect(() => {
    setPage(1);
  }, [suggestions]);

  // --- CORRECT PAGINATION ---
  const start = fullPage ? (page - 1) * ITEMS_PER_PAGE : 0;
  const end = fullPage ? page * ITEMS_PER_PAGE : ITEMS_PER_PAGE;
  const displayed = suggestions.slice(start, end);
  const hasMore = end < suggestions.length;

  // Mark displayed users as seen
  useEffect(() => {
    displayed.forEach(u => markSuggestionSeen(u.uid));
  }, [displayed.map(u => u.uid).join(","), markSuggestionSeen]);

  if (!currentUser) return null;

  // EMPTY STATE
  if (suggestions.length === 0) {
    if (compact) return null;
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
    <Card className={`space-y-3 ${compact ? "p-2" : "p-4"} ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="flex justify-between items-center">
          <H2 className={fullPage ? "text-2xl font-bold" : "text-xl font-bold"}>
            {fullPage ? "People You May Know" : "Connect"}
          </H2>
          {showRotate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={rotateVisibleSuggestions}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Users */}
      <ul className={`space-y-3 ${compact ? "px-2" : ""}`}>
        {displayed.map(u => (
          <li key={u.uid} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <MyAvatar
                username={u.username}
                fullName={u.fullName}
                photoURL={u.photoURL}
                size={compact ? 45 : 65}
              />
              <div className="min-w-0">
                <Name username={u.username} fullName={u.fullName} />
                <p className="text-xs text-muted-foreground truncate">
                  {u.work || u.company || u.location || "Member"}
                </p>
              </div>
            </div>
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
    </Card>
  );
}
