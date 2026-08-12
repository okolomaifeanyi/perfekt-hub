import {
  MoreHorizontal,
  Forward,
  Copy,
  Trash2,
  ReplyIcon,
  SmileIcon,
  Pin,
  PinOff,
} from "lucide-react";
import Image from "next/image";
import RichText from "@/components/RichText";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { db } from "@/lib/supabase";
import {
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  getDocs,
  query,
  where,
} from "@/lib/supabase";
import { MessageProps } from "@/lib/types";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useUserStore } from "@/lib/store/useUserStore";
import { getCompactTimeAgo } from "../utils";
import { useUser } from "@/hooks/useUser";

interface MessagesProps {
  messages: MessageProps[];
  conversationId: string;
  onReply: (msg: MessageProps) => void;
  onForward: (msg: MessageProps) => void;
}

const Messages = forwardRef<HTMLDivElement, MessagesProps>(
  ({ messages, conversationId, onReply, onForward }, ref) => {
    const { user } = useUserStore();
    const [pickerFor, setPickerFor] = useState<string | null>(null);
    const pickerRef = useRef<HTMLDivElement | null>(null);
    const [pickerPosition, setPickerPosition] = useState<"top" | "bottom">(
      "top"
    );

    useEffect(() => {
      if (!pickerFor) return;
      const el = document.getElementById(`msg-${pickerFor}`);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      setPickerPosition(
        spaceAbove > 60 ? "top" : spaceBelow > 60 ? "bottom" : "top"
      );
    }, [pickerFor]);

    useEffect(() => {
      const handleDocClick = (e: Event) => {
        if (!pickerRef.current) return;
        if (!(pickerRef.current as HTMLElement).contains(e.target as Node)) {
          setPickerFor(null);
        }
      };

      document.addEventListener("mousedown", handleDocClick);
      return () => document.removeEventListener("mousedown", handleDocClick);
    }, []);

    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
    };

    const handleRemoveForMe = async (id: string) => {
      await updateDoc(
        doc(db, "conversations", conversationId, "messages", id),
        {
          hiddenFor: arrayUnion(user?.uid),
        }
      );
    };

    const handleDeleteForEveryone = async (msg: MessageProps) => {
      if (!user?.uid) return;

      const messageRef = doc(
        db,
        "conversations",
        conversationId,
        "messages",
        msg.id
      );

      await deleteDoc(messageRef);
    };

    const handleReact = async (msg: MessageProps, emoji: string) => {
      if (!user?.uid) return;
      const ref = doc(db, "conversations", conversationId, "messages", msg.id);
      const currentReactions = msg.reactions ?? {};
      const hasReacted = currentReactions[emoji]?.includes(user.uid) ?? false;

      await updateDoc(ref, {
        [`reactions.${emoji}`]: hasReacted
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid),
      });
      setPickerFor(null);
    };

    const handlePin = async (msg: MessageProps) => {
      const messagesRef = collection(
        db,
        "conversations",
        conversationId,
        "messages"
      );
      const pinnedSnap = await getDocs(
        query(messagesRef, where("isPinned", "==", true))
      );
      const isAlreadyPinned = pinnedSnap.docs.some(d => d.id === msg.id);

      const unpinTasks = pinnedSnap.docs
        .filter(d => d.id !== msg.id)
        .map(d => updateDoc(d.ref, { isPinned: false }));

      await Promise.all(unpinTasks);
      await updateDoc(doc(messagesRef, msg.id), { isPinned: !isAlreadyPinned });
    };

    const pinnedMessage = messages.find(m => m.isPinned);
    const pinnedUser = useUser(pinnedMessage?.senderId ?? null);

    const [chatTouched, setChatTouched] = useState("");

    return (
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 w-full">
        <a href={`#${pinnedMessage?.id}`} className="bg-secondary! mb-2! block">
          {pinnedMessage && (
            <div className="px-3 py-2 flex items-center gap-2 text-sm">
              <Pin className="w-4 h-4" />
              <span className="truncate">
                <strong className="text-primary">
                  {pinnedMessage.senderId === user?.uid
                    ? "You"
                    : `@${pinnedUser?.username}`}
                  :
                </strong>{" "}
                {pinnedMessage.text}
              </span>
            </div>
          )}
        </a>

        {messages.map(msg => {
          const isMe = msg.senderId === user?.uid;
          const isHidden = msg.hiddenFor?.includes(user?.uid || "");
          if (isHidden) return null;

          return (
            <div
              id={msg.id}
              key={msg.id}
              className={`flex ${
                isMe ? "justify-end mr-2" : "justify-start ml-2"
              }`}
              onTouchEnd={() => {
                setChatTouched(msg.id);
                setTimeout(() => setChatTouched(""), 3000);
              }}
            >
              <div
                className={`relative group w-full max-w-62.5 p-4 rounded-2xl shadow-sm leading-normal ${
                  isMe ? "bg-primary! text-primary-foreground font-semibold" : "bg-secondary"
                }`}
              >
                {msg.replyTo && (
                  <div
                    className={`border-l-4 pl-2 mb-1 text-xs ${
                      isMe ? "border-white/60" : "border-primary/60"
                    }`}
                  >
                    <p className="font-semibold opacity-80">
                      {msg.replyTo.senderId === user?.uid
                        ? "You"
                        : msg.replyTo.senderName || "Them"}
                    </p>
                    <p className="truncate opacity-70">
                      <RichText text={msg.replyTo.text} />
                    </p>
                  </div>
                )}

                {msg.forwarded && (
                  <p className="text-xs italic opacity-70 mb-1">Forwarded</p>
                )}

                {msg.media?.src && (
                  <div className="mb-2">
                    {msg.media.type === "image" ? (
                      <Image
                        src={msg.media.src}
                        className="rounded-lg max-h-60 w-auto"
                        alt=""
                        width={200}
                        height={200}
                      />
                    ) : (
                      <video
                        src={msg.media.src}
                        controls
                        className="rounded-lg max-h-60 max-w-full"
                      />
                    )}
                  </div>
                )}

                {msg.text && <RichText text={msg.text} />}

                <span className="block text-[10px] opacity-70 mt-1 text-right">
                  {msg.createdAt?.toDate
                    ? getCompactTimeAgo(msg.createdAt.toDate())
                    : "just now"}
                </span>

                {msg.isPinned && (
                  <div className="absolute top-2 right-2 text-xs text-foreground flex items-center gap-1 z-10">
                    <Pin className="h-3 w-3" />
                  </div>
                )}

                {Object.entries(msg.reactions || {})
                  .filter(([, uids]) => (uids as string[]).length > 0)
                  .map(([emoji, uids]) => (
                    <span key={emoji} className="text-sm mr-1">
                      {emoji} {Array.isArray(uids) ? uids.length : 0}
                    </span>
                  ))}

                {/* Desktop Actions — anchored above the bubble and aligned
                    to the same edge it's already aligned to (right for your
                    own messages, left for theirs), instead of pushed 128px
                    out to the side. That offset assumed more free horizontal
                    space than a narrow chat pane or mobile viewport
                    actually has, routinely pushing these off-screen. */}
                <div
                  className={`absolute -top-9 z-20 opacity-0 group-hover:opacity-100 transition flex gap-x-1.5 items-center ${
                    isMe ? "right-0" : "left-0"
                  } ${chatTouched === msg.id ? "opacity-100" : ""}`}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" aria-label="More options">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40">
                      <DropdownMenuItem onClick={() => onForward(msg)}>
                        <Forward className="h-4 w-4 mr-2" /> Forward
                      </DropdownMenuItem>
                      {isMe && (
                        <DropdownMenuItem onClick={() => handlePin(msg)}>
                          {msg.isPinned ? (
                            <span className="flex gap-x-4">
                              <PinOff className="h-4 w-4" /> Unpin
                            </span>
                          ) : (
                            <span className="flex gap-x-4">
                              <Pin className="h-4 w-4" /> Pin
                            </span>
                          )}
                        </DropdownMenuItem>
                      )}
                      {msg.text && (
                        <DropdownMenuItem onClick={() => handleCopy(msg.text!)}>
                          <Copy className="h-4 w-4 mr-2" /> Copy
                        </DropdownMenuItem>
                      )}
                      {isMe ? (
                        <DropdownMenuItem
                          onClick={() => handleDeleteForEveryone(msg)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete for
                          everyone
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleRemoveForMe(msg.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Remove for me
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    onClick={() =>
                      setPickerFor(pickerFor === msg.id ? null : msg.id)
                    }
                    variant="secondary"
                    size="icon"
                    aria-label="Add reaction"
                  >
                    <SmileIcon className="w-5 h-5" />
                  </Button>

                  <Button
                    onClick={() => onReply(msg)}
                    variant="secondary"
                    size="icon"
                    aria-label="Reply"
                  >
                    <ReplyIcon className="h-5 w-5" />
                  </Button>
                  {pickerFor === msg.id && (
                    <div
                      ref={pickerRef}
                      className={`absolute z-auto left-1/2 -translate-x-1/2 flex flex-row gap-1 p-2 rounded-xl shadow-lg bg-popover text-popover-foreground border ${
                        pickerPosition === "top"
                          ? "bottom-full mb-2"
                          : "top-full mt-2"
                      }`}
                    >
                      {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg, emoji)}
                          className="text-base p-1 rounded-md hover:bg-accent transition"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={ref} />
      </div>
    );
  }
);

Messages.displayName = "Messages";
export default Messages;

