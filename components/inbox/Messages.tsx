import {
  MoreHorizontal,
  Forward,
  Pin,
  Copy,
  Trash2,
  ReplyIcon,
  SmileIcon,
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
} from "firebase/firestore";
import { MessageProps } from "@/lib/types";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useUserStore } from "@/lib/store/useUserStore";

import { getCompactTimeAgo } from "../utils";

interface MessagesProps {
  messages: MessageProps[];
  conversationId: string;
  onReply: (msg: MessageProps) => void;
  onForward: (msg: MessageProps) => void;
  onPin: (msg: MessageProps) => void;
}

const Messages = forwardRef<HTMLDivElement, MessagesProps>(
  ({ messages, conversationId, onReply, onForward, onPin }, ref) => {
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

    // ✅ Delete for everyone
    const handleDeleteForEveryone = async (id: string) => {
      await deleteDoc(doc(db, "conversations", conversationId, "messages", id));
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

    return (
      <div className="flex-1 overflow-y-auto p-3 space-y-2 sticky w-full bottom-0">
        {messages.map(msg => {

          const isMe = msg.senderId === user?.uid;
          const isHidden = msg.hiddenFor?.includes(user?.uid || "");
          if (isHidden) return null; // don’t render hidden msgs

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative group w-full bg-gray-100 border-gray-200 max-w-[250px] p-4 rounded-2xl shadow-sm leading-1.5 rounded-e-xl rounded-es-xl dark:bg-gray-700 ${
                  isMe ? "bg-primary text-white" : "bg-secondary"
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

                {Object.entries(msg.reactions || {})
                  .filter(([, uids]) => (uids as string[]).length > 0)
                  .map(([emoji, uids]) => (
                    <span key={emoji} className="text-sm mr-1">
                      {emoji} {Array.isArray(uids) ? uids.length : 0}
                    </span>
                  ))}

                {/* Actions */}
                <div className="absolute top-1 -left-32 opacity-0 group-hover:opacity-100 transition flex gap-x-1.5 items-center">
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
                      <DropdownMenuItem onClick={() => onPin(msg)}>
                        <Pin className="h-4 w-4 mr-2" /> Pin
                      </DropdownMenuItem>
                      {msg.text && (
                        <DropdownMenuItem onClick={() => handleCopy(msg.text!)}>
                          <Copy className="h-4 w-4 mr-2" /> Copy
                        </DropdownMenuItem>
                      )}
                      {isMe ? (
                        <DropdownMenuItem
                          onClick={() => handleDeleteForEveryone(msg.id)}
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
