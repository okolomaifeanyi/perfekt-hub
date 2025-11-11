import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PostComposer from "./PostComposer";
import { Quote } from "lucide-react";
import PostIdDate from "@/app/(dashboard)/[username]/[postId]/components/PostIdDate";
import { OptimisticCallbacks, PostProps, UserProps } from "@/lib/types";
import Text from "../feed/post/Text";
import { Card } from "../ui/card";
import { usePostCounts } from "@/lib/store/postCounts";
import { useState } from "react";

export function QuotePostDialog({
  user,
  post,
  optimistic,
}: {
  user: UserProps;
  post: PostProps;
  optimistic?: OptimisticCallbacks;
}) {
  const [open, setOpen] = useState(false);

  const mediaSummary = (() => {
    if (!post.media || post.media.length === 0) return null;

    let imageCount = 0,
      gifCount = 0,
      videoCount = 0;
    for (const medium of post.media) {
      if (medium.type === "image" && medium.src.includes("giphy")) gifCount++;
      else if (medium.type === "image") imageCount++;
      else if (medium.type === "video") videoCount++;
    }

    const parts: string[] = [];
    if (imageCount > 0)
      parts.push(`${imageCount} image${imageCount > 1 ? "s" : ""}`);
    if (gifCount > 0) parts.push(`${gifCount} gif${gifCount > 1 ? "s" : ""}`);
    if (videoCount > 0)
      parts.push(`${videoCount} video${videoCount > 1 ? "s" : ""}`);

    return `Contains ${parts.join(", ")}`;
  })();

  const postCounts = usePostCounts(state => state.counts[post.id]);
  const quoteCount = postCounts?.quoteCount ?? 0;
  const hasCount = quoteCount > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={hasCount ? "outline" : "secondary"}
          title="Quote"
          className="hover:text-green-600 flex items-center gap-1"
          onClick={() => setOpen(true)}
        >
          <Quote
            size={16}
            fill={hasCount ? "currentColor" : "none"}
            stroke="currentColor"
            className={hasCount ? "text-green-600" : ""}
          />
          {hasCount && (
            <span className={`text-base ${hasCount ? "text-green-600" : ""}`}>
              {quoteCount}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>
            Quote <span className="text-primary">{user.username}</span>
          </DialogTitle>
        </DialogHeader>

        <PostComposer
          quotePostId={post.id}
          placeholder="Write your quote"
          sendButton="Quote"
          onSuccess={() => setOpen(false)}
          optimistic={optimistic}
        />

        <Card className="p-2 rounded-lg">
          <PostIdDate user={user} post={post} />
          <Text text={post.content} />
          {mediaSummary && (
            <div className="text-secondary mt-2">{mediaSummary}</div>
          )}
        </Card>
      </DialogContent>
    </Dialog>
  );
}
