"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, FileText, Globe, Lock, MoreVertical, Pin } from "lucide-react";
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
import { votePoll, type PollProps } from "@/app/actions/polls";
import { userAltImageUrl } from "@/components/UserAltImageUrl";

type TimelineItem =
  | { type: "post"; data: GroupPostProps }
  | { type: "poll"; data: PollProps };

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
  const [revealed, setRevealed] = useState(false);
  const isSensitive = post.moderationStatus === "sensitive" && !revealed;
  const [textRevealed, setTextRevealed] = useState(false);
  const isTextToxic = post.textToxic && !textRevealed;

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

      {post.text && (
        isTextToxic ? (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span className="flex-1">This post may contain harassment or spam.</span>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setTextRevealed(true)}>
              Show
            </Button>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap wrap-break-word">{post.text}</p>
        )
      )}

      {post.media && post.media.length > 0 && (
        <div
          className={`relative ${
            post.media.length === 1
              ? "overflow-hidden rounded-lg"
              : "grid gap-1 rounded-lg overflow-hidden grid-cols-2"
          }`}
        >
          {isSensitive && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70 text-center backdrop-blur-xl">
              <AlertTriangle className="size-6 text-muted-foreground" />
              <p className="max-w-56 text-xs font-medium text-muted-foreground">
                This post may contain sensitive content
              </p>
              <Button size="sm" variant="outline" onClick={() => setRevealed(true)}>
                View
              </Button>
            </div>
          )}
          {post.media.map((m, i) =>
            m.type === "video" ? (
              <video
                key={i}
                src={m.url}
                controls
                className="w-full max-h-80 object-cover rounded-lg"
              />
            ) : m.type === "pdf" ? (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border p-3 text-sm hover:bg-muted/50"
              >
                <FileText className="size-5 shrink-0 text-red-500" />
                <span className="truncate underline">
                  {(m as { name?: string }).name || "PDF document"}
                </span>
              </a>
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

function InlinePollCard({
  poll,
  isMember,
  onVoted,
}: {
  poll: PollProps;
  isMember: boolean;
  onVoted: (updated: PollProps) => void;
}) {
  const [voting, setVoting] = useState<string | null>(null);
  const hasVoted = !!poll.myVoteOptionId;

  const handleVote = async (optionId: string) => {
    if (!isMember) {
      toast.error("Join the group to vote on this poll");
      return;
    }
    setVoting(optionId);
    try {
      await votePoll(poll.id, optionId);
      onVoted({
        ...poll,
        myVoteOptionId: optionId,
        options: poll.options.map(o => {
          if (o.id === optionId && poll.myVoteOptionId !== optionId) {
            return { ...o, voteCount: o.voteCount + 1 };
          }
          if (o.id === poll.myVoteOptionId && poll.myVoteOptionId !== optionId) {
            return { ...o, voteCount: Math.max(0, o.voteCount - 1) };
          }
          return o;
        }),
        totalVotes: poll.myVoteOptionId ? poll.totalVotes : poll.totalVotes + 1,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to vote");
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">Poll</Badge>
        {poll.visibility === "private" && (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Lock className="size-2.5" />
            Members only
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {format(new Date(poll.createdAt), "MMM d, yyyy · h:mm a")}
        </span>
      </div>

      <p className="font-medium text-sm">{poll.question}</p>

      <div className="space-y-2">
        {poll.options.map(option => {
          const pct =
            poll.totalVotes > 0
              ? Math.round((option.voteCount / poll.totalVotes) * 100)
              : 0;
          const isMine = option.id === poll.myVoteOptionId;

          return (
            <button
              key={option.id}
              type="button"
              disabled={poll.closed || !!voting}
              onClick={() => handleVote(option.id)}
              className="relative w-full overflow-hidden rounded-lg border text-left transition disabled:cursor-default"
            >
              {(hasVoted || poll.closed) && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/15"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className={isMine ? "font-semibold" : undefined}>
                  {option.label}
                  {isMine && " ✓"}
                </span>
                {(hasVoted || poll.closed) && (
                  <span className="text-xs text-muted-foreground">
                    {pct}% ({option.voteCount})
                  </span>
                )}
              </div>
              {!poll.anonymous && (hasVoted || poll.closed) && option.voters && option.voters.length > 0 && (
                <div className="relative flex items-center gap-1.5 px-3 pb-2">
                  <div className="flex -space-x-1.5">
                    {option.voters.slice(0, 5).map(voter => (
                      <Avatar key={voter.uid} className="size-5 border border-background">
                        <AvatarImage
                          src={voter.photoURL || userAltImageUrl({ name: voter.fullName || voter.username })}
                          alt=""
                        />
                        <AvatarFallback className="text-[9px]">
                          {(voter.fullName || voter.username || "U").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {option.voters
                      .slice(0, 3)
                      .map(v => v.fullName || v.username)
                      .join(", ")}
                    {option.voters.length > 3 && ` +${option.voters.length - 3} more`}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {poll.anonymous ? "Anonymous poll · " : ""}{poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
        {poll.closed ? " · Closed" : !isMember ? " · Join the group to vote" : ""}
      </p>
    </div>
  );
}

export function GroupPostsFeed({
  timeline,
  isAdmin,
  isMember,
  currentUid,
  onPollVoted,
}: {
  timeline: TimelineItem[];
  isAdmin: boolean;
  isMember: boolean;
  currentUid?: string;
  onPollVoted?: (updated: PollProps) => void;
}) {
  const [localPosts, setLocalPosts] = useState<Record<string, GroupPostProps>>({});

  const getPost = (post: GroupPostProps) => localPosts[post.id] ?? post;

  const handlePostUpdate = (updated: GroupPostProps) => {
    setLocalPosts(prev => ({ ...prev, [updated.id]: updated }));
  };

  // Pinned posts bubble to top
  const sorted = [...timeline].sort((a, b) => {
    const aPinned = a.type === "post" && a.data.isPinned;
    const bPinned = b.type === "post" && b.data.isPinned;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No posts yet — be the first to share something.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map(item =>
        item.type === "post" ? (
          <GroupPostCard
            key={`post-${item.data.id}`}
            post={getPost(item.data)}
            isAdmin={isAdmin}
            currentUid={currentUid}
            onUpdate={handlePostUpdate}
          />
        ) : (
          <InlinePollCard
            key={`poll-${item.data.id}`}
            poll={item.data}
            isMember={isMember}
            onVoted={updated => onPollVoted?.(updated)}
          />
        )
      )}
    </div>
  );
}
