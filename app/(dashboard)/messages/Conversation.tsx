import JustAvatar from "@/components/JustAvatar";
import { getCompactTimeAgo } from "@/components/utils";
import { useUser } from "@/hooks/useUser";
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
  return (
    <Link
      key={conv.id}
      href={`/messages/${conv.id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition"
    >
      {otherUser && <JustAvatar size={45} user={otherUser} />}
      <div className="flex-1 min-w-0">
        <div className="font-medium">
          {otherUser?.fullName || otherUser?.username}
        </div>
        <div className="text-sm text-gray-500 truncate">
          {conv.lastMessage || "No messages yet"}
        </div>
      </div>
      <div className="text-xs text-gray-400">
        {/* {conv.lastMessageAt &&
          new Date(conv.lastMessageAt.seconds * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })} */}
        {conv.lastMessageAt
          ? getCompactTimeAgo(conv.lastMessageAt?.toDate())
          : "Just now"}
      </div>
    </Link>
  );
};

export default Conversation;
