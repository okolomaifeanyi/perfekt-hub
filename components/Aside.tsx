"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";

import WhoToFollow from "./Features/follow/WhoToFollow";
import RecommendationRail from "@/components/feed/RecommendationRail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDirectConversationId } from "@/lib/conversation-utils.mjs";
import { getUser } from "@/lib/data";
import { useUserConnections } from "@/hooks/UserConnections";
import { useConversations } from "@/hooks/useConversations";
import { useUserStore } from "@/lib/store/useUserStore";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import { UserProps } from "@/lib/types";
import ConversationRow from "@/app/(dashboard)/messages/Conversation";
import NewConversationDialog from "@/components/inbox/NewConversationDialog";

function MessagesAside() {
  const { conversations, loaded, user } = useConversations();

  return (
    <div className="flex w-full flex-col p-4">
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="text-base font-semibold">Messages</h2>
        <NewConversationDialog />
      </div>

      <div className="flex flex-col gap-1">
        {!loaded &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        {loaded && conversations.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No conversations yet
          </p>
        )}
        {user &&
          conversations.map(conv => {
            const other =
              conv.participants.find(p => p !== user.uid) || "Unknown";
            return <ConversationRow key={conv.id} otherUid={other} conv={conv} />;
          })}
      </div>
    </div>
  );
}

type FriendPreview = UserProps & {
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

export default function Aside() {
  const pathname = usePathname();
  const currentUser = useUserStore(state => state.user);
  const { friends } = useUserConnections();
  const [friendPreviews, setFriendPreviews] = useState<FriendPreview[]>([]);

  useEffect(() => {
    let active = true;

    void (async () => {
      const profiles = await Promise.all(friends.slice(0, 6).map(friendId => getUser(friendId)));
      const previews = profiles
        .filter((profile): profile is UserProps => Boolean(profile))
        .map(profile => ({
          ...profile,
          status: getFriendStatus(profile),
        }))
        .sort((left, right) => {
          const order = { online: 0, "recently-active": 1, offline: 2 } as const;
          return order[left.status] - order[right.status];
        })
        .slice(0, 2);

      if (active) {
        setFriendPreviews(previews);
      }
    })();

    return () => {
      active = false;
    };
  }, [friends]);

  const friendsLabel = useMemo(() => {
    if (friendPreviews.length === 0) return "No active friends yet";
    return friendPreviews.length === 1 ? "1 friend active" : `${friendPreviews.length} friends active`;
  }, [friendPreviews.length]);

  if (pathname?.startsWith("/messages")) {
    return <MessagesAside />;
  }

  return (
    <div className="flex w-full flex-col space-y-6 p-4">
      <Card className="py-4">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Friends online</CardTitle>
          <p className="text-sm text-muted-foreground">{friendsLabel}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {friendPreviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your friends will appear here when they are active.
            </p>
          ) : (
            friendPreviews.map(friend => {
              const conversationId = currentUser
                ? buildDirectConversationId(currentUser.uid, friend.uid)
                : friend.uid;

              return (
                <div
                  key={friend.uid}
                  className="flex items-center gap-3 rounded-2xl border bg-background/60 p-3"
                >
                  <Avatar className="size-11">
                    <AvatarImage
                      src={
                        friend.photoURL ||
                        userAltImageUrl({
                          name: friend.fullName || friend.username,
                        })
                      }
                      alt={`${friend.fullName || friend.username}'s avatar`}
                    />
                    <AvatarFallback>
                      {(friend.fullName || friend.username || "U")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {friend.fullName || friend.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{friend.username} ·{" "}
                      {friend.status === "online"
                        ? "online"
                        : friend.status === "recently-active"
                          ? "recently active"
                          : "offline"}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button asChild size="sm" variant="secondary" className="h-8">
                        <Link href={`/messages/${conversationId}`}>
                          <MessageCircle className="mr-1.5 size-4" />
                          Message
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link href={`/messages/${conversationId}`}>
                          <Phone className="mr-1.5 size-4" />
                          Call
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <WhoToFollow compact />

      <RecommendationRail type="groups" />
    </div>
  );
}
