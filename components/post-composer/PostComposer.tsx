// components/PostComposer.tsx (client)
"use client";

import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { useUserStore } from "@/lib/store/useUserStore";
import { extractFirstUrl } from "@/lib/url-pattern.mjs";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MediaProps, OptimisticCallbacks, PostProps } from "@/lib/types";
import MediaGallery from "./MediaGallery";
import Buttons from "./Buttons";
import MyAvatar from "../feed/post/MyAvatar";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { handlePost, type ProductDraft } from "./utils";
import { generateDraftDescription } from "@/app/actions/aiDraft";
import { toast } from "sonner";

const MAX_TEXT = 280;
const MAX_MEDIA = 4;
const MAX_POLL_OPTIONS = 6;
const MAX_PRODUCT_GALLERY = 4;
const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "CAD"];

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
  const [pollMode, setPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [sellMode, setSellMode] = useState(false);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCurrency, setProductCurrency] = useState(CURRENCIES[0]);
  const [productGallery, setProductGallery] = useState<MediaProps[]>([]);
  const [draftingDescription, setDraftingDescription] = useState(false);
  const linkPreviewUrl = extractFirstUrl(text);
  const isSending = loading || isSubmitting;
  const validPollOptions = pollOptions.map(o => o.trim()).filter(Boolean);
  const parsedPrice = Number(productPrice);
  const isValidPrice = productPrice.trim() !== "" && Number.isFinite(parsedPrice) && parsedPrice >= 0;
  const canSend = pollMode
    ? text.trim().length > 0 && validPollOptions.length >= 2
    : sellMode
      ? productName.trim().length > 0 && isValidPrice
      : text.trim().length > 0 || media.length > 0;

  const resetPoll = () => {
    setPollMode(false);
    setPollOptions(["", ""]);
  };

  const resetSell = () => {
    setSellMode(false);
    setProductName("");
    setProductPrice("");
    setProductCurrency(CURRENCIES[0]);
    setProductGallery([]);
  };

  const handleTogglePoll = () => {
    if (pollMode) {
      resetPoll();
      return;
    }
    resetSell();
    setMedia([]);
    setPollMode(true);
  };

  const handleToggleSell = () => {
    if (sellMode) {
      resetSell();
      return;
    }
    resetPoll();
    setMedia(prev => prev.slice(0, 1));
    setSellMode(true);
  };

  const handleDraftDescription = async () => {
    if (!productName.trim()) {
      toast.error("Add an item name first");
      return;
    }
    setDraftingDescription(true);
    try {
      const context = `Product listing. Item: ${productName.trim()}${
        isValidPrice ? `. Price: ${productCurrency} ${productPrice}` : ""
      }. Write a short, appealing description for the listing.`;
      const draft = await generateDraftDescription(context);
      setText(draft);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate a description");
    } finally {
      setDraftingDescription(false);
    }
  };

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

  const handleSetMedia: React.Dispatch<React.SetStateAction<MediaProps[]>> = update => {
    setMedia(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      // Only one image shows in the feed for a product listing — extra
      // photos belong in the gallery uploader below, shown on the post's
      // own detail page instead.
      return sellMode ? next.slice(0, 1) : next;
    });
  };

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
      postType: pollMode ? "poll" : sellMode ? "product" : "text",
    } as Partial<PostProps>;

    const tempId = optimistic?.addOptimisticPost?.(partial) ?? null;

    const sentPollOptions = pollMode ? validPollOptions : undefined;
    const sentProduct: ProductDraft | undefined = sellMode
      ? {
          name: productName.trim(),
          price: parsedPrice,
          currency: productCurrency,
          images: productGallery,
        }
      : undefined;

    setText("");
    setMedia([]);
    setGifDialogOpen(false);
    resetPoll();
    resetSell();
    onSuccess?.();

    try {
      const serverPost = await handlePost({
        text,
        media,
        user,
        parentPostId,
        quotePostId,
        pollOptions: sentPollOptions,
        product: sentProduct,
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
      if (sentPollOptions) {
        setPollMode(true);
        setPollOptions(sentPollOptions);
      }
      if (sentProduct) {
        setSellMode(true);
        setProductName(sentProduct.name);
        setProductPrice(String(sentProduct.price));
        setProductCurrency(sentProduct.currency);
        setProductGallery(sentProduct.images);
      }
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
            placeholder={
              pollMode
                ? "Ask a question…"
                : sellMode
                  ? "Describe what you're selling…"
                  : placeholder || "What's on your mind?"
            }
            className="resize-none overflow-hidden rounded-lg wrap-break-word"
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                handleSend();
              }
            }}
            maxLength={MAX_TEXT}
          />

          {pollMode && (
            <div className="space-y-2 rounded-lg border p-3">
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={e =>
                      setPollOptions(prev =>
                        prev.map((o, i) => (i === index ? e.target.value : o))
                      )
                    }
                    placeholder={`Option ${index + 1}`}
                    maxLength={100}
                    disabled={isSending}
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() =>
                        setPollOptions(prev => prev.filter((_, i) => i !== index))
                      }
                      disabled={isSending}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < MAX_POLL_OPTIONS && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setPollOptions(prev => [...prev, ""])}
                  disabled={isSending}
                >
                  <Plus className="mr-1 size-3.5" />
                  Add option
                </Button>
              )}
            </div>
          )}

          {sellMode && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Item name</label>
                  <Input
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="e.g. Vintage camera"
                    maxLength={100}
                    disabled={isSending}
                  />
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Price</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productPrice}
                    onChange={e => setProductPrice(e.target.value)}
                    placeholder="0.00"
                    disabled={isSending}
                  />
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Currency</label>
                  <Select value={productCurrency} onValueChange={setProductCurrency}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => void handleDraftDescription()}
                disabled={draftingDescription || !productName.trim()}
              >
                {draftingDescription ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 size-3.5" />
                )}
                Draft description with AI
              </Button>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Additional photos (shown on the post page, not in the feed)
                </label>
                <div className="flex flex-wrap gap-2">
                  {productGallery.map((item, i) => (
                    <div key={i} className="relative size-16 overflow-hidden rounded-md border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.src} alt="" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProductGallery(prev => prev.filter((_, j) => j !== i))}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {productGallery.length < MAX_PRODUCT_GALLERY && (
                    <label
                      htmlFor="product-gallery-input"
                      className="flex size-16 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent"
                    >
                      <ImagePlus className="size-5" />
                    </label>
                  )}
                  <input
                    id="product-gallery-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const files = e.target.files;
                      if (!files) return;
                      const additions = Array.from(files)
                        .slice(0, MAX_PRODUCT_GALLERY - productGallery.length)
                        .map(file => ({ file, src: URL.createObjectURL(file), type: "image" as const }));
                      setProductGallery(prev => [...prev, ...additions]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {linkPreviewUrl && !pollMode && !sellMode && <LinkPreviewCard url={linkPreviewUrl} />}

          <div className="flex items-center gap-2">
            {/* The toolbar can hold up to 6 icon buttons (media, emoji, gif,
                poll, sell, event) — flex-wrap let it push Share onto its own
                row on narrow screens, sometimes off to one side by itself.
                Scrolling horizontally instead keeps Share pinned in place. */}
            <div className="flex flex-1 min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none">
              <Buttons
                setText={setText}
                setMedia={handleSetMedia}
                setGifDialogOpen={setGifDialogOpen}
                gifDialogOpen={gifDialogOpen}
                media={media}
                showEvent={!parentPostId && !quotePostId}
                showPoll={!parentPostId && !quotePostId}
                pollMode={pollMode}
                onTogglePoll={handleTogglePoll}
                showSell={!parentPostId && !quotePostId}
                sellMode={sellMode}
                onToggleSell={handleToggleSell}
              />
            </div>

            {text.length > 0 && (
              <p className="shrink-0 text-xs text-muted-foreground">
                {text.length}/{MAX_TEXT}
              </p>
            )}

            <Button
              size="sm"
              className="shrink-0"
              onClick={handleSend}
              disabled={isSending || !canSend || text.length > MAX_TEXT}
            >
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSending ? "Sending..." : sendButton || "Share"}
            </Button>
          </div>
        </div>
      </div>

      <MediaGallery media={media} setMedia={handleSetMedia} />
    </div>
  );
};

export default PostComposer;
