import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PostComposer from "./PostComposer";
import { MessageCircleMore } from "lucide-react";
import PostIdDate from "@/app/(dashboard)/[username]/[postId]/components/PostIdDate";
import { PostProps, UserProps } from "@/lib/types";
import Text from "../feed/post/Text";
import { usePostCounts } from "@/lib/store/postCounts";
import { useState } from "react";

export function PostReplyDialog({
  user,
  post,
}: {
  user: UserProps;
  post: PostProps;
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
  const replyCount = postCounts?.replyCount ?? 0;
  const hasCount = replyCount > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={hasCount ? "outline" : "secondary"}
          title="Comment"
          className="hover:text-green-600 flex items-center gap-1"
          onClick={() => setOpen(true)}
        >
          <MessageCircleMore
            size={16}
            fill={hasCount ? "currentColor" : "none"}
            stroke="currentColor"
            className={hasCount ? "text-green-600" : ""}
          />
          {hasCount && (
            <span className={`text-base ${hasCount ? "text-green-600" : ""}`}>
              {replyCount}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="space-y-4">
        <div>
          <PostIdDate user={user} post={post} />
          <Text text={post.content} />
          {mediaSummary && (
            <div className="text-secondary mt-2">{mediaSummary}</div>
          )}
        </div>

        <DialogHeader>
          <DialogTitle className="text-secondary">
            Replying to <span className="text-primary">{user.username}</span>
          </DialogTitle>
        </DialogHeader>

        <PostComposer
          parentPostId={post.id}
          placeholder="Write your reply"
          sendButton="Reply"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
