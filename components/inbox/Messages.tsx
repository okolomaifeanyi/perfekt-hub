import {
  MoreHorizontal,
  Forward,
  // Pin,
  Copy,
  Trash2,
  ReplyIcon,
  SmileIcon,
  Pin,
  PinOff,
} from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { db } from "@/lib/firebase";
import {
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { MessageProps } from "@/lib/types";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useUserStore } from "@/lib/store/useUserStore";
import { getCompactTimeAgo } from "../utils";
import { useUser } from "@/hooks/useUser";
// import Link from "next/link";

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
    const longPressTimer = useRef<number | null>(null);
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

      // use 60px as approx picker height
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
      document.addEventListener("touchstart", handleDocClick);

      return () => {
        document.removeEventListener("mousedown", handleDocClick);
        document.removeEventListener("touchstart", handleDocClick);
      };
    }, []);

    // ✅ Copy
    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
    };

    // ✅ Remove for me (soft delete → mark hidden for this uid)
    const handleRemoveForMe = async (id: string) => {
      await updateDoc(
        doc(db, "conversations", conversationId, "messages", id),
        {
          hiddenFor: arrayUnion(user?.uid),
        }
      );
    };

    // ✅ Delete for user (move to deletedMessages)
    const handleDeleteForEveryone = async (msg: MessageProps) => {
      if (!user?.uid) return;

      const messageRef = doc(
        db,
        "conversations",
        conversationId,
        "messages",
        msg.id
      );
      const deletedRef = doc(db, "users", user.uid, "deletedMessages", msg.id);

      // Save a copy for user
      await setDoc(deletedRef, {
        ...msg,
        deletedAt: new Date(),
        conversationId,
      });

      // Remove from active chat
      await deleteDoc(messageRef);
    };

    // ✅ React
    const handleReact = async (msg: MessageProps, emoji: string) => {
      const ref = doc(db, "conversations", conversationId, "messages", msg.id);
      if (!user?.uid) return;

      const currentReactions = msg.reactions ?? {};
      const hasReacted = currentReactions[emoji]?.includes(user.uid) ?? false;

      await updateDoc(ref, {
        [`reactions.${emoji}`]: hasReacted
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid),
      });

      // close picker after reacting (optional)
      setPickerFor(null);
    };

    // ✅ Handle Pin (only one at a time)
    const handlePin = async (msg: MessageProps) => {
      const messagesRef = collection(
        db,
        "conversations",
        conversationId,
        "messages"
      );

      // 1️⃣ Find currently pinned message(s)
      const pinnedSnap = await getDocs(
        query(messagesRef, where("isPinned", "==", true))
      );

      // 2️⃣ Determine if the clicked one is already pinned
      const isAlreadyPinned = pinnedSnap.docs.some(d => d.id === msg.id);

      // 3️⃣ Unpin others
      const unpinTasks = pinnedSnap.docs
        .filter(d => d.id !== msg.id)
        .map(d => updateDoc(d.ref, { isPinned: false }));

      await Promise.all(unpinTasks);

      // 4️⃣ Toggle this one
      const thisRef = doc(messagesRef, msg.id);
      await updateDoc(thisRef, { isPinned: !isAlreadyPinned });
    };

    const pinnedMessage = messages.find(m => m.isPinned);
    // const normalMessages = messages.filter(m => !m.isPinned);
    // const allMessages = [...pinnedMessages, ...normalMessages];

    const pinnedUser = useUser(pinnedMessage?.senderId ?? null);

    return (
      <div className="flex-1 overflow-y-auto space-y-2 sticky w-full bottom-0">
        <a href={`#${pinnedMessage?.id}`} className="!bg-secondary !mb-2 block">
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
          if (isHidden) return null; // don’t render hidden msgs

          return (
            <div
              id={msg.id}
              key={msg.id}
              className={`flex ${
                isMe ? "justify-end mr-2" : "justify-start ml-2"
              }`}
            >
              <div
                className={`relative group w-full bg-gray-100 border-gray-200 max-w-[250px] p-4 rounded-2xl shadow-sm leading-relaxed rounded-e-xl rounded-es-xl ${
                  isMe ? "!bg-primary text-white" : "bg-secondary"
                }`}
                // long-press support for touch
                onTouchStart={() => {
                  // 600ms long press
                  longPressTimer.current = window.setTimeout(() => {
                    setPickerFor(msg.id);
                  }, 600);
                }}
                onTouchEnd={() => {
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                }}
                onTouchMove={() => {
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                }}
              >
                {/* Reply preview */}
                {msg.replyTo && (
                  <div
                    className={`border-l-4 pl-2 mb-1 text-xs ${
                      isMe ? "border-white/60" : "border-primary/60"
                    }`}
                  >
                    <p className="font-semibold opacity-80">
                      {msg.replyTo.senderId === user?.uid
                        ? "You"
                        : msg.replyTo.senderId}
                    </p>
                    <p className="truncate opacity-70">{msg.replyTo.text}</p>
                  </div>
                )}

                {/* Media */}
                {msg.media && (
                  <div className="mb-2">
                    {msg.media.type.startsWith("image") ? (
                      <Image
                        src={msg.media.src}
                        className="rounded-lg max-h-60"
                        alt=""
                        width={200}
                        height={200}
                      />
                    ) : (
                      <a
                        href={msg.media.src}
                        target="_blank"
                        className="underline text-sm"
                      >
                        Attachment
                      </a>
                    )}
                  </div>
                )}

                {/* Text */}
                {msg.text}

                {/* Timestamp */}
                <span className="block text-[10px] opacity-70 mt-1 text-right">
                  {msg.createdAt?.toDate
                    ? getCompactTimeAgo(msg.createdAt.toDate())
                    : "just now"}
                </span>

                {msg.isPinned && (
                  <div className="absolute top-2 right-2 text-xs text-yellow-500 flex items-center gap-1 z-10">
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

                {/* Actions */}
                <div
                  className={`absolute top-1 opacity-0 group-hover:opacity-100 transition flex gap-x-1.5 items-center ${
                    isMe ? "-left-32" : "-right-32"
                  }`}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon">
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
                  >
                    <SmileIcon className="w-5 h-5" />
                  </Button>

                  <Button
                    onClick={() => onReply(msg)}
                    variant="secondary"
                    size="icon"
                  >
                    <ReplyIcon className="h-5 w-5" />
                  </Button>

                  {pickerFor === msg.id && (
                    <div
                      ref={pickerRef}
                      className={`absolute z-auto left-1/2 -translate-x-1/2 flex flex-row gap-1 p-2 rounded-xl shadow-lg bg-white
      ${pickerPosition === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
                    >
                      {["👍", "❤️", "😂", "😮", "😢", "👏"].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg, emoji)}
                          className="text-base p-1 rounded-md hover:bg-gray-100 transition"
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
