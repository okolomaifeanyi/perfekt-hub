// components/PostComposer.tsx (client)
"use client";

import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { useUserStore } from "@/lib/store/useUserStore";
import { extractFirstUrl } from "@/lib/url-pattern.mjs";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MediaProps, OptimisticCallbacks, PostProps } from "@/lib/types";
import MediaGallery from "./MediaGallery";
import Buttons from "./Buttons";
import MyAvatar from "../feed/post/MyAvatar";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { handlePost } from "./utils";

const MAX_TEXT = 280;
const MAX_MEDIA = 4;

const PostComposer = ({
  placeholder,
  sendButton,
  parentPostId,
  quotePostId,
  onSuccess,
  optimistic,
  className,
  isSubmitting,
  autoFocusTextArea = false,
}: {
  sendButton?: string;
  placeholder?: string;
  parentPostId?: string | "";
  quotePostId?: string | "";
  onSuccess?: () => void;
  optimistic?: OptimisticCallbacks;
  className?: string;
  isSubmitting?: boolean;
  autoFocusTextArea?: boolean;
}) => {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<MediaProps[]>([]);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const linkPreviewUrl = extractFirstUrl(text);
  const isSending = loading || isSubmitting;
  const canSend = text.trim().length > 0 || media.length > 0;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // `loading` state doesn't apply until the next render, so a rapid
  // double-click or a Ctrl+Enter racing a mouse click can both pass the
  // `isSending` check before React re-renders — this ref closes that gap
  // synchronously, since it's readable/writable before the first `await`.
  const sendingRef = useRef(false);
  const { user } = useUserStore(state => state);

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
    if (
      sendingRef.current ||
      isSending ||
      !canSend ||
      text.length > MAX_TEXT ||
      media.length > MAX_MEDIA
    )
      return;

    sendingRef.current = true;
    setLoading(true);

    const partial = {
      userId: user.uid,
      username: user.username,
      userPhotoURL: user.photoURL || "",
      userFullName: user.fullName || "",
      content: text,
      media: media.map(m => ({ src: m.src || "", type: m.type })),
      parentPostId: parentPostId || "",
      quotePostId: quotePostId || "",
      replyCount: 0,
      quoteCount: 0,
    } as Partial<PostProps>;

    const tempId = optimistic?.addOptimisticPost?.(partial) ?? null;

    setText("");
    setMedia([]);
    setGifDialogOpen(false);
    onSuccess?.();

    try {
      const serverPost = await handlePost({
        text,
        media,
        user,
        parentPostId,
        quotePostId,
      });

      if (tempId && serverPost) {
        optimistic?.replaceOptimisticPost?.(tempId, serverPost);
      } else if (tempId) {
        optimistic?.replaceOptimisticPost?.(tempId, null);
      }
    } catch {
      if (tempId) optimistic?.replaceOptimisticPost?.(tempId, null);
      setText(text);
      setMedia(media);
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex space-x-2 items-start">
        <MyAvatar
          username={user.username}
          photoURL={user.photoURL}
          fullName={user.fullName}
        />

        <div className="flex-1 min-w-0 space-y-2">
          <Textarea
            ref={textareaRef}
            autoFocus={autoFocusTextArea}
            onChange={e => setText(e.target.value)}
            value={text}
            placeholder={placeholder || "What's on your mind?"}
            className="resize-none overflow-hidden rounded-lg wrap-break-word"
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                handleSend();
              }
            }}
            maxLength={MAX_TEXT}
          />

          {linkPreviewUrl && <LinkPreviewCard url={linkPreviewUrl} />}

          <div className="flex justify-between items-center flex-wrap">
            <Buttons
              setText={setText}
              setMedia={setMedia}
              setGifDialogOpen={setGifDialogOpen}
              gifDialogOpen={gifDialogOpen}
              media={media}
              showEvent={!parentPostId && !quotePostId}
            />

            {text.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {text.length}/{MAX_TEXT}
              </p>
            )}

            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSending || !canSend || text.length > MAX_TEXT}
            >
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSending ? "Sending..." : sendButton || "Share"}
            </Button>
          </div>
        </div>
      </div>

      <MediaGallery media={media} setMedia={setMedia} />
    </div>
  );
};

export default PostComposer;
