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

export function PostReplyDialog({
  user,
  post,
  replyCount,
}: {
  user: UserProps;
  post: PostProps;
  replyCount?: number | null;
}) {
  // build media summary
  const mediaSummary = (() => {
    if (!post.media || post.media.length === 0) return null;

    let imageCount = 0;
    let gifCount = 0;
    let videoCount = 0;

    for (const medium of post.media) {
      if (medium.type === "image" && medium.src.includes("giphy")) {
        gifCount++;
      } else if (medium.type === "image") {
        imageCount++;
      } else if (medium.type === "video") {
        videoCount++;
      }
    }

    const parts: string[] = [];
    if (imageCount > 0)
      parts.push(`${imageCount} image${imageCount > 1 ? "s" : ""}`);
    if (gifCount > 0)
      parts.push(`${gifCount} gif image${gifCount > 1 ? "s" : ""}`);
    if (videoCount > 0)
      parts.push(`${videoCount} video${videoCount > 1 ? "s" : ""}`);

    return `Contains ${parts.join(", ")}`;
  })();

  const hasCount = (replyCount ?? 0) > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={hasCount ? "outline" : "secondary"}
          title="Comment"
          className="hover:text-green-600 flex items-center gap-1"
        >
          <MessageCircleMore
            fontSize={16}
            // fill={hasCount ? "#00a63e" : "none"}
            // color={hasCount ? "#00a63e" : undefined}
          />

          {hasCount && (
            <span className={`text-base`}>
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
        />
      </DialogContent>
    </Dialog>
  );
}
