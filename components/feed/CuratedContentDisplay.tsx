"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { toast } from "sonner";
import { Radio, Heart, ThumbsDown, MessageCircle, Quote, Share2, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCompactTimeAgo } from "@/lib/time-format.mjs";
import type { CuratedContentItem } from "@/app/actions/curatedContent";
import type { CuratedContentReactionSummary, ReactionType } from "@/app/actions/curatedContentReactions";
import {
  incrementCuratedContentView,
  getCuratedContentComments,
  addCuratedContentComment,
  type CuratedContentComment,
} from "@/app/actions/curatedContentEngagement";
import { useUserStore } from "@/lib/store/useUserStore";
import ComposePostDialog from "@/components/feed/ComposePostDialog";
import { cn } from "@/lib/utils";

// Shared between /updates and Discover's Trends/category tabs — both render
// the same curated_content rows, just in different tab/filter arrangements.

// getCompactTimeAgo only handles the past — it computes now-minus-date with
// no floor, so a future timestamp (an upcoming fixture's kickoff, or a
// betting prediction published with that same future commence_time) comes
// back as a raw negative number of minutes instead of a sensible label
// (confirmed live: betting predictions were rendering "-21190m"). date-fns'
// format() is also locale-independent, unlike toLocaleString(undefined,
// ...), which caused a separate server/client hydration mismatch here.
export function formatContentTime(publishedAt: string) {
  const date = new Date(publishedAt);
  if (date.getTime() > Date.now()) return format(date, "EEE h:mm a");
  return getCompactTimeAgo(date);
}

function CommentThread({ contentId }: { contentId: string }) {
  const currentUser = useUserStore(state => state.user);
  const [comments, setComments] = useState<CuratedContentComment[] | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getCuratedContentComments(contentId)
      .then(result => {
        if (active) setComments(result);
      })
      .catch(() => {
        if (active) setComments([]);
      });
    return () => {
      active = false;
    };
  }, [contentId]);

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error("Sign in to comment");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const comment = await addCuratedContentComment(contentId, trimmed);
      setComments(prev => [...(prev ?? []), comment]);
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="space-y-2 border-t border-border/60 px-3 py-2"
      onClick={event => event.stopPropagation()}
    >
      {comments === null ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet — be the first.</p>
      ) : (
        <div className="space-y-1.5">
          {comments.map(comment => (
            <p key={comment.id} className="text-xs leading-relaxed">
              <span className="font-medium">
                {comment.author?.fullName || comment.author?.username || "Someone"}
              </span>{" "}
              <span className="text-muted-foreground">{comment.body}</span>
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") void handleSubmit();
          }}
          placeholder="Add a comment…"
          maxLength={500}
          className="flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !text.trim()}
          className="shrink-0 text-xs font-medium text-primary disabled:opacity-50"
        >
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Post"}
        </button>
      </div>
    </div>
  );
}

// Own row below the card content rather than nested inside it — ContentRow
// wraps its whole card in an <a> when there's a source link, and a <button>
// nested inside an <a> is both invalid HTML and would trigger the link
// navigation on every reaction click.
function ActionBar({
  item,
  reaction,
  onToggle,
}: {
  item: CuratedContentItem;
  reaction?: CuratedContentReactionSummary;
  onToggle?: (type: ReactionType) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Fire-and-forget, once per card mount — best-effort impression count,
  // not a strict per-visitor unique (see incrementCuratedContentView).
  useEffect(() => {
    void incrementCuratedContentView(item.id);
  }, [item.id]);

  if (!onToggle) return null;
  const liked = reaction?.userReaction === "like";
  const disliked = reaction?.userReaction === "dislike";

  const shareUrl = item.source_url || (typeof window !== "undefined" ? `${window.location.origin}/updates` : "/updates");
  const handleShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: item.title, url: shareUrl });
        return;
      } catch {
        // User cancelled, or the platform rejected it — fall through to copy.
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const quoteText = `"${item.title}"${item.source_url ? `\n\n${item.source_url}` : ""}`;

  return (
    <div onClick={event => event.stopPropagation()}>
      <div className="flex items-center gap-3 border-t border-border/60 px-3 py-1.5">
        <button
          type="button"
          onClick={() => onToggle("like")}
          aria-label="Like"
          className={cn(
            "flex items-center gap-1 text-xs text-muted-foreground transition hover:text-red-500",
            liked && "text-red-500"
          )}
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} />
          {reaction && reaction.likeCount > 0 && <span>{reaction.likeCount}</span>}
        </button>

        <button
          type="button"
          onClick={() => onToggle("dislike")}
          aria-label="Dislike"
          className={cn(
            "flex items-center gap-1 text-xs text-muted-foreground transition hover:text-blue-600",
            disliked && "text-blue-600"
          )}
        >
          <ThumbsDown size={14} fill={disliked ? "currentColor" : "none"} />
          {reaction && reaction.dislikeCount > 0 && <span>{reaction.dislikeCount}</span>}
        </button>

        <button
          type="button"
          onClick={() => setShowComments(v => !v)}
          aria-label="Comment"
          className={cn(
            "flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground",
            showComments && "text-foreground"
          )}
        >
          <MessageCircle size={14} />
        </button>

        <button
          type="button"
          onClick={() => setQuoteOpen(true)}
          aria-label="Quote"
          className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <Quote size={14} />
        </button>

        <button
          type="button"
          onClick={() => void handleShare()}
          aria-label="Share"
          className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <Share2 size={14} />
          {shareCopied && <span>Copied!</span>}
        </button>

        <span
          title="Views"
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Eye size={14} />
          {item.view_count > 0 && <span>{item.view_count}</span>}
        </span>
      </div>

      {showComments && <CommentThread contentId={item.id} />}

      {quoteOpen && (
        <ComposePostDialog open={quoteOpen} onOpenChange={setQuoteOpen} initialText={quoteText} />
      )}
    </div>
  );
}

type FootballMetadata = {
  competition?: string;
  status?: string;
  minute?: number | null;
  matchday?: number | null;
  homeTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  awayTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  score?: { home: number; away: number } | null;
};

function teamLabel(team?: { name?: string | null; shortName?: string | null }) {
  return team?.shortName || team?.name || "TBD";
}

export function MatchRow({
  match,
  reaction,
  onToggleReaction,
}: {
  match: CuratedContentItem;
  reaction?: CuratedContentReactionSummary;
  onToggleReaction?: (type: ReactionType) => void;
}) {
  const meta = match.metadata as FootballMetadata;
  const isLive = match.category === "football_live";

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{meta.competition}</p>
          <p className="truncate text-sm font-medium">
            {teamLabel(meta.homeTeam)} <span className="text-muted-foreground">vs</span>{" "}
            {teamLabel(meta.awayTeam)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {typeof meta.score?.home === "number" && typeof meta.score?.away === "number" ? (
            <span className="font-mono text-sm font-semibold tabular-nums">
              {meta.score.home}-{meta.score.away}
            </span>
          ) : null}

          {isLive ? (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <Radio className="size-2.5" />
              {typeof meta.minute === "number" ? `${meta.minute}'` : "Live"}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">{formatContentTime(match.published_at)}</span>
          )}
        </div>
      </div>

      <ActionBar item={match} reaction={reaction} onToggle={onToggleReaction} />
    </div>
  );
}

// A match moving fixture -> live -> result keeps its published_at meaning
// different per category (kickoff time vs. result time) — grouping and
// sorting each bucket separately keeps live first, soonest-upcoming next,
// most-recent-result last, instead of one list sorted by a mixed meaning.
export function groupMatches(matches: CuratedContentItem[]) {
  const live = matches.filter(m => m.category === "football_live");
  const upcoming = [...matches.filter(m => m.category === "football_fixture")].sort(
    (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
  );
  const results = matches.filter(m => m.category === "football_result");
  return { live, upcoming, results };
}

export function ContentRow({
  item,
  reaction,
  onToggleReaction,
}: {
  item: CuratedContentItem;
  reaction?: CuratedContentReactionSummary;
  onToggleReaction?: (type: ReactionType) => void;
}) {
  const body = (
    <div className="flex gap-3 px-3 py-2.5 transition hover:bg-accent/40">
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt=""
          width={64}
          height={64}
          unoptimized
          className="size-16 shrink-0 rounded-md object-cover"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
        {item.body ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {item.source_name} · {formatContentTime(item.published_at)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      {item.source_url ? (
        <a href={item.source_url} target="_blank" rel="noopener noreferrer">
          {body}
        </a>
      ) : (
        body
      )}
      <ActionBar item={item} reaction={reaction} onToggle={onToggleReaction} />
    </div>
  );
}
