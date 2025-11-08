"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { Loader2, X } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
  increment,
} from "firebase/firestore";
import { Dispatch, SetStateAction, useState } from "react";
import { DraftMessage, UserProps } from "@/lib/types";
import Emoji from "../post-composer/Emoji";

const Composer = ({
  newMsg,
  user,
  conversationId,
  targetUid,
  setNewMsg,
}: {
  newMsg: DraftMessage;
  user: UserProps | null;
  conversationId: string;
  targetUid: string;
  setNewMsg: Dispatch<SetStateAction<DraftMessage>>;
}) => {
  const [sending, setSending] = useState(false);

  const sendMessage = async (
    text?: string,
    media?: { url: string; type: string }
  ) => {
    if (!user || (!text && !media)) return;
    setSending(true);
    try {
      await addDoc(
        collection(db, "conversations", conversationId, "messages"),
        {
          senderId: user.uid,
          text: text ?? "",
          media: media ?? null,
          replyTo: newMsg.replyTo ?? null,
          createdAt: serverTimestamp(),
          readBy: [user.uid],
          reactions: {},
        }
      );

      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: text || (media ? "Attachment" : ""),
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${user.uid}`]: 0,
        [`unreadCount.${targetUid}`]: increment(1),
      });

      setNewMsg({ text: "" });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t p-2 flex flex-col gap-2 bg-card">
      {newMsg.replyTo && (
        <div className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg text-sm">
          <div className="truncate">
            Replying to:{" "}
            <span className="font-medium">{newMsg.replyTo.text}</span>
          </div>
          <Button
            onClick={() => setNewMsg(p => ({ ...p, replyTo: undefined }))}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Emoji
          onSelect={e => setNewMsg(m => ({ ...m, text: m.text + e.native }))}
        />

        <Textarea
          className="flex-1 resize-none leading-tight min-h-0 !h-[unset]"
          placeholder="Type a message..."
          value={newMsg.text}
          rows={1}
          onChange={e => setNewMsg(p => ({ ...p, text: e.target.value }))}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (newMsg.text.trim()) sendMessage(newMsg.text.trim());
            }
          }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = "auto";
            t.style.height = `${t.scrollHeight}px`;
          }}
        />

        <Button
          disabled={sending || !newMsg.text.trim()}
          onClick={() => sendMessage(newMsg.text.trim())}
          variant="secondary"
          size="sm"
        >
          {sending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <PaperAirplaneIcon className="size-6" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default Composer;
