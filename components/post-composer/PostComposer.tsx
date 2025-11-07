// components/PostComposer.tsx (client)
"use client";

import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useEffect, useRef, useState } from "react";
import type { MediaProps, PostProps } from "@/lib/types";
import MediaGallery from "./MediaGallery";
import Buttons from "./Buttons";
import MyAvatar from "../feed/post/MyAvatar";
import { useUserStore } from "@/lib/store/useUserStore";
import { handlePost } from "./utils";

interface OptimisticCallbacks {
  addOptimisticPost?: (partialPost: Partial<PostProps>) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replaceOptimisticPost?: (tempId: string, serverPost: any) => void;
  removeOptimisticPost?: (tempId: string) => void;
}

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
}: {
  sendButton?: string;
  placeholder?: string;
  parentPostId?: string | "";
  quotePostId?: string | "";
  onSuccess?: () => void;
  optimistic?: OptimisticCallbacks;
  className?: string;
  isSubmitting?: boolean;
}) => {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<MediaProps[]>([]);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const canSend = text.trim().length > 0 || media.length > 0;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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
      loading ||
      isSubmitting ||
      !canSend ||
      text.length > MAX_TEXT ||
      media.length > MAX_MEDIA
    )
      return;

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
      setLoading(false);
    }
  };

  return (
    <div className={`${className} space-y-2`}>
      <div className="flex space-x-2 items-start">
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
            className="resize-none overflow-hidden rounded-lg break-words"
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                handleSend();
              }
            }}
            maxLength={MAX_TEXT}
          />

          <div className="flex justify-between items-center flex-wrap">
            <Buttons
              setText={setText}
              setMedia={setMedia}
              setGifDialogOpen={setGifDialogOpen}
              gifDialogOpen={gifDialogOpen}
              media={media}
            />

            {text.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {text.length}/{MAX_TEXT}
              </p>
            )}

            <Button
              size="sm"
              onClick={handleSend}
              disabled={
                loading || !canSend || isSubmitting || text.length > MAX_TEXT
              }
            >
              {loading || isSubmitting ? "Wait..." : sendButton || "Share"}
            </Button>
          </div>
        </div>
      </div>

      <MediaGallery media={media} setMedia={setMedia} />
    </div>
  );
};

export default PostComposer;
