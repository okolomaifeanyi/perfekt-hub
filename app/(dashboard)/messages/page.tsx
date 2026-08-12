"use client";

import { H1, P } from "@/components/Typography";
import Conversation from "./Conversation";
import NewConversationDialog from "@/components/inbox/NewConversationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversations } from "@/hooks/useConversations";

function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="size-[45px] rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { conversations, loaded, user, authReady } = useConversations();

  if (!authReady || !user) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <H1 className="text-xl font-bold">Messages</H1>
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 6 }).map((_, i) => (
            <ConversationRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <H1 className="text-xl font-bold">Messages</H1>
        <NewConversationDialog />
      </div>

      <div className="flex flex-col gap-3">
        {!loaded &&
          Array.from({ length: 6 }).map((_, i) => (
            <ConversationRowSkeleton key={i} />
          ))}
        {loaded && conversations.length === 0 && (
          <P className="text-muted-foreground">No conversations yet</P>
        )}
        {conversations.map(conv => {
          const other =
            conv.participants.find(p => p !== user.uid) || "Unknown";
          return <Conversation key={conv.id} otherUid={other} conv={conv} />;
        })}
      </div>
    </div>
  );
}
