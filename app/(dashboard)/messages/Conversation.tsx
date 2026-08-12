import JustAvatar from "@/components/JustAvatar";
import { getCompactTimeAgo } from "@/components/utils";
import { useUser } from "@/hooks/useUser";
import { useUserStore } from "@/lib/store/useUserStore";
import { ConversationProps } from "@/lib/types";
import Link from "next/link";

const Conversation = ({
  otherUid,
  conv,
}: {
  otherUid: string;
  conv: ConversationProps;
}) => {
  const otherUser = useUser(otherUid);
  const { user } = useUserStore();
  const unreadCount = (user?.uid && conv.unreadCount?.[user.uid]) || 0;

  return (
    <Link
      key={conv.id}
      href={`/messages/${conv.id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition"
    >
      {otherUser ? (
        <JustAvatar size={45} user={otherUser} />
      ) : (
        <div className="size-[45px] shrink-0 rounded-full bg-muted animate-pulse" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium">
          {otherUser?.fullName || otherUser?.username || (
            <span className="inline-block h-4 w-24 rounded bg-muted animate-pulse" />
          )}
        </div>
        <div
          className={`text-sm truncate ${
            unreadCount > 0
              ? "text-foreground font-semibold"
              : "text-muted-foreground"
          }`}
        >
          {conv.lastMessage || "No messages yet"}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-muted-foreground">
          {conv.lastMessageAt
            ? getCompactTimeAgo(conv.lastMessageAt.toDate())
            : "Just now"}
        </span>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
};

export default Conversation;
