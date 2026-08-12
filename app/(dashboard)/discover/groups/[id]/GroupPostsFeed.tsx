"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Globe, Lock, MoreVertical, Pin, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  pinGroupPost,
  updateGroupPostVisibility,
  type GroupPostProps,
  type GroupPostVisibility,
} from "@/app/actions/groups";
import { userAltImageUrl } from "@/components/UserAltImageUrl";

function GroupPostCard({
  post,
  isAdmin,
  currentUid,
  onUpdate,
}: {
  post: GroupPostProps;
  isAdmin: boolean;
  currentUid?: string;
  onUpdate: (updated: GroupPostProps) => void;
}) {
  const isAuthor = post.userId === currentUid;
  const canManage = isAdmin || isAuthor;

  const handlePin = async () => {
    try {
      await pinGroupPost(post.id, !post.isPinned);
      onUpdate({ ...post, isPinned: !post.isPinned });
      toast.success(post.isPinned ? "Post unpinned" : "Post pinned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update pin");
    }
  };

  const handleVisibility = async (v: GroupPostVisibility) => {
    try {
      await updateGroupPostVisibility(post.id, v);
      onUpdate({ ...post, visibility: v });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update visibility");
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Pin className="size-3" />
          Pinned post
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarImage
            src={
              post.authorPhotoURL ||
              userAltImageUrl({ name: post.authorFullName || post.authorUsername || "" })
            }
            alt=""
          />
          <AvatarFallback>
            {(post.authorFullName || post.authorUsername || "U").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-sm font-medium">
                {post.authorFullName || post.authorUsername}
              </span>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs shrink-0">
                {post.visibility === "public" ? (
                  <Globe className="size-2.5" />
                ) : (
                  <Lock className="size-2.5" />
                )}
                {post.visibility === "public" ? "Public" : "Members"}
              </Badge>
            </div>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <DropdownMenuItem className="gap-2" onClick={handlePin}>
                      <Pin className="size-4" />
                      {post.isPinned ? "Unpin post" : "Pin post"}
                    </DropdownMenuItem>
                  )}
                  {(isAdmin || isAuthor) && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5">
                        <p className="mb-1 text-xs text-muted-foreground">Visibility</p>
                        <Select value={post.visibility} onValueChange={v => void handleVisibility(v as GroupPostVisibility)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              <span className="flex items-center gap-1.5 text-xs">
                                <Globe className="size-3" /> Public
                              </span>
                            </SelectItem>
                            <SelectItem value="private">
                              <span className="flex items-center gap-1.5 text-xs">
                                <Lock className="size-3" /> Members only
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {format(new Date(post.createdAt), "MMM d, yyyy · h:mm a")}
          </p>
        </div>
      </div>

      {post.text && <p className="text-sm whitespace-pre-wrap break-words">{post.text}</p>}

      {post.media && post.media.length > 0 && (
        <div
          className={
            post.media.length === 1
              ? "overflow-hidden rounded-lg"
              : "grid gap-1 rounded-lg overflow-hidden grid-cols-2"
          }
        >
          {post.media.map((m, i) =>
            m.type === "video" ? (
              <video
                key={i}
                src={m.url}
                controls
                className="w-full max-h-80 object-cover rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={m.url}
                alt=""
                className="w-full max-h-80 object-cover"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

export function GroupPostsFeed({
  groupId,
  initialPosts,
  isAdmin,
  currentUid,
}: {
  groupId: string;
  initialPosts: GroupPostProps[];
  isAdmin: boolean;
  currentUid?: string;
}) {
  const [posts, setPosts] = useState<GroupPostProps[]>(initialPosts);

  const handleUpdate = (updated: GroupPostProps) => {
    setPosts(prev => {
      const next = prev.map(p => (p.id === updated.id ? updated : p));
      // Keep pinned on top
      return [
        ...next.filter(p => p.isPinned),
        ...next.filter(p => !p.isPinned),
      ];
    });
  };

  // Expose addPost so composer can prepend
  (GroupPostsFeed as unknown as { addPost?: (p: GroupPostProps) => void }).addPost = (p: GroupPostProps) => {
    setPosts(prev => [p, ...prev]);
  };

  if (posts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No posts yet — be the first to share something.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <GroupPostCard
          key={post.id}
          post={post}
          isAdmin={isAdmin}
          currentUid={currentUid}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}
