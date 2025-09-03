"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FacebookShareButton,
  FacebookIcon,
  TwitterShareButton,
  TwitterIcon,
  LinkedinShareButton,
  LinkedinIcon,
  WhatsappShareButton,
  WhatsappIcon,
  TelegramShareButton,
  TelegramIcon,
  EmailShareButton,
  EmailIcon,
  RedditShareButton,
  RedditIcon,
  PinterestShareButton,
  PinterestIcon,
} from "next-share";
import { Copy, Check, Share2 } from "lucide-react";
import { motion } from "framer-motion";

interface SharePostDialogProps {
  username: string;
  postId: string;
  title: string;
  description?: string;
  image?: string;
  shareCount?: number;
}

export function SharePostDialog({
  username,
  postId,
  title,
  description,
  image,
  shareCount = 0,
}: SharePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/${username}/${postId}`
      : `${username}/${postId}`;

  const hasCount = shareCount > 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={hasCount ? "outline" : "secondary"}
          title="Share"
          className="hover:text-blue-600 flex items-center gap-1"
          onClick={() => setOpen(true)}
        >
          <Share2 size={16} className={hasCount ? "text-blue-600" : ""} />
          {hasCount && (
            <span className={`text-base ${hasCount ? "text-blue-600" : ""}`}>
              {shareCount}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md space-y-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle>Share this post</DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center"
        >
          {/* Top row - popular apps */}
          <WhatsappShareButton url={url} title={title}>
            <WhatsappIcon size={48} round />
          </WhatsappShareButton>

          <TwitterShareButton url={url} title={title}>
            <TwitterIcon size={48} round />
          </TwitterShareButton>

          <FacebookShareButton url={url} quote={title}>
            <FacebookIcon size={48} round />
          </FacebookShareButton>

          <TelegramShareButton url={url} title={title}>
            <TelegramIcon size={48} round />
          </TelegramShareButton>

          {/* Second row - less used */}
          <LinkedinShareButton url={url} title={title} summary={description}>
            <LinkedinIcon size={48} round />
          </LinkedinShareButton>

          <RedditShareButton url={url} title={title}>
            <RedditIcon size={48} round />
          </RedditShareButton>

          <PinterestShareButton
            url={url}
            media={image || url}
            description={title}
          >
            <PinterestIcon size={48} round />
          </PinterestShareButton>

          <EmailShareButton url={url} subject={title} body={description}>
            <EmailIcon size={48} round />
          </EmailShareButton>

          {/* Native Share API */}
          {"share" in navigator && (
            <Button
              onClick={() => navigator.share({ title, text: description, url })}
              size="icon"
              variant="outline"
              className="rounded-full hover:bg-muted/50 w-[48px] h-[48px]"
            >
              <Share2 />
            </Button>
          )}
        </motion.div>

        {/* Copy link */}
        <div className="mt-6 flex items-center justify-between border rounded-lg py-2">
          <span className="truncate text-sm text-gray-500">{url}</span>
          <Button
            onClick={handleCopy}
            size="sm"
            variant="ghost"
            className="ml-2 flex items-center gap-2"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
