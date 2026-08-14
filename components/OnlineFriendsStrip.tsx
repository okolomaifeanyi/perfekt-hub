"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buildDirectConversationId } from "@/lib/conversation-utils.mjs";
import { useOnlineFriends } from "@/hooks/useOnlineFriends";
import { useUserStore } from "@/lib/store/useUserStore";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import { cn } from "@/lib/utils";

// Mobile equivalent of the desktop Aside's "Friends online" card — that
// sidebar is hidden below the lg breakpoint entirely (see Main.tsx), so
// mobile had no way to see who's currently online at all. A horizontal
// avatar strip (tap to open the conversation) fits a narrow screen far
// better than the desktop's stacked cards with inline Message/Call buttons.
export function OnlineFriendsStrip() {
  const currentUser = useUserStore(state => state.user);
  const { friendPreviews } = useOnlineFriends(10);

  const active = friendPreviews.filter(f => f.status !== "offline");
  if (active.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-none lg:hidden">
      {active.map(friend => {
        const conversationId = currentUser
          ? buildDirectConversationId(currentUser.uid, friend.uid)
          : friend.uid;

        return (
          <Link
            key={friend.uid}
            href={`/messages/${conversationId}`}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div className="relative">
              <Avatar className="size-12">
                <AvatarImage
                  src={
                    friend.photoURL ||
                    userAltImageUrl({ name: friend.fullName || friend.username })
                  }
                  alt={`${friend.fullName || friend.username}'s avatar`}
                />
                <AvatarFallback>
                  {(friend.fullName || friend.username || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute right-0 bottom-0 size-3 rounded-full border-2 border-background",
                  friend.status === "online" ? "bg-green-500" : "bg-yellow-500"
                )}
              />
            </div>
            <span className="max-w-14 truncate text-[11px] text-muted-foreground">
              {friend.fullName || friend.username}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
