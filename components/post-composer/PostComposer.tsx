"use client";

import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useEffect, useRef, useState } from "react";
import { MediaProps } from "@/lib/types";
import MediaGallery from "./MediaGallery";
import Buttons from "./Buttons";
import MyAvatar from "../feed/post/MyAvatar";
import { useUserStore } from "@/lib/store/useUserStore";
import { handlePost } from "./utils";
import { Loader2 } from "lucide-react";

const PostComposer = ({
  placeholder,
  sendButton,
  parentPostId,
  quotePostId,
}: {
  sendButton?: string;
  placeholder?: string;
  parentPostId?: string | "";
  quotePostId?: string | "";
}) => {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<MediaProps[]>([]);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const canSend = text.trim() || media.length > 0;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { user } = useUserStore(state => state);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (text.trim() || media.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [text, media]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  if (!user) return null;

  const handleSend = async () => {
    if (loading || !canSend || text.length > 280) return;

    setLoading(true);

    await handlePost({
      text,
      media,
      user,
      onSuccess: () => {
        setText("");
        setMedia([]);
        setGifDialogOpen(false);
      },
      parentPostId,
      quotePostId,
    }).catch(err => {
      console.error("Error sending post:", err);
    });

    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <MyAvatar
          username={user.username}
          photoURL={user.photoURL}
          fullName={user.fullName}
        />

        <div className="space-y-2 w-full">
          <Textarea
            ref={textareaRef}
            onChange={e => setText(e.target.value)}
            value={text}
            placeholder={placeholder || "What's on your mind?"}
            className="resize-none overflow-hidden rounded-lg"
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                handleSend();
              }
            }}
            maxLength={280}
          />

          <div className="flex justify-between items-center flex-wrap gap-2">
            <Buttons
              setText={setText}
              setMedia={setMedia}
              setGifDialogOpen={setGifDialogOpen}
              gifDialogOpen={gifDialogOpen}
              media={media}
            />

            {text.length > 0 && (
              <p className="text-xs text-muted-foreground">{text.length}/280</p>
            )}

            <Button
              size="sm"
              onClick={handleSend}
              disabled={loading || !canSend || text.length > 280}
              aria-label="Send post"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 mr-1" />
                  Sending...
                </>
              ) : (
                sendButton || "Share"
              )}
            </Button>
          </div>
        </div>
      </div>

      <MediaGallery media={media} setMedia={setMedia} />
    </div>
  );
};

export default PostComposer;
