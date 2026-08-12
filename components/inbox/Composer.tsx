"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { db } from "@/lib/supabase";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
  increment,
} from "@/lib/supabase";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { toast } from "sonner";
import { DraftMessage, MediaProps, UserProps } from "@/lib/types";
import { uploadToCloudinary } from "../post-composer/utils";
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = !sending && (!!newMsg.text.trim() || !!newMsg.media);

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Only images and videos can be attached");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      const media: MediaProps = {
        src: result.secure_url,
        type: isVideo ? "video" : "image",
      };
      setNewMsg(p => ({ ...p, media }));
    } catch (e) {
      console.error(e);
      toast.error("Failed to attach file");
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (text?: string, media?: MediaProps) => {
    if (!user || (!text && !media)) return;
    setSending(true);
    try {
      await addDoc(
        collection(db, "conversations", conversationId, "messages"),
        {
          senderId: user.uid,
          text: text ?? "",
          ...(media ? { media } : {}),
          replyTo: newMsg.replyTo ?? null,
          createdAt: serverTimestamp(),
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
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (!canSend) return;
    sendMessage(newMsg.text.trim() || undefined, newMsg.media);
  };

  return (
    <div className="border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex flex-col gap-2 bg-card shrink-0 sticky bottom-0 z-10">
      {newMsg.replyTo && (
        <div className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg text-sm">
          <div className="truncate">
            Replying to:{" "}
            <span className="font-medium">{newMsg.replyTo.text}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cancel reply"
            onClick={() => setNewMsg(p => ({ ...p, replyTo: undefined }))}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      )}

      {(newMsg.media || uploading) && (
        <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm">
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span className="text-muted-foreground">Uploading...</span>
            </>
          ) : (
            newMsg.media && (
              <>
                {newMsg.media.type === "image" ? (
                  <Image
                    src={newMsg.media.src}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded object-cover"
                  />
                ) : (
                  <video
                    src={newMsg.media.src}
                    className="size-10 rounded object-cover"
                    muted
                  />
                )}
                <span className="flex-1 text-muted-foreground">
                  {newMsg.media.type === "image" ? "Image" : "Video"} attached
                </span>
              </>
            )
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove attachment"
            disabled={uploading}
            onClick={() => setNewMsg(p => ({ ...p, media: undefined }))}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Emoji
          onSelect={e => setNewMsg(m => ({ ...m, text: m.text + e.native }))}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={e => {
            void handleFileSelected(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach image or video"
          disabled={uploading || !!newMsg.media}
          onClick={handleAttachClick}
        >
          <ImageIcon className="size-5" />
        </Button>

        <Textarea
          className="flex-1 resize-none leading-tight min-h-0 !h-[unset]"
          placeholder="Type a message..."
          value={newMsg.text}
          rows={1}
          onChange={e => setNewMsg(p => ({ ...p, text: e.target.value }))}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = "auto";
            t.style.height = `${t.scrollHeight}px`;
          }}
        />

        <Button
          type="button"
          disabled={!canSend}
          onClick={handleSend}
          variant="secondary"
          size="sm"
          aria-label="Send message"
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
