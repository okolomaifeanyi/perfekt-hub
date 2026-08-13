"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUserStore } from "@/lib/store/useUserStore";
import { getPostPoll, votePostPoll, type PostPollProps } from "@/app/actions/posts";

export default function PostPollCard({ postId }: { postId: string }) {
  const currentUid = useUserStore(state => state.user?.uid);
  const [poll, setPoll] = useState<PostPollProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPostPoll(postId)
      .then(result => {
        if (active) setPoll(result);
      })
      .catch(err => console.error("getPostPoll failed:", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId]);

  const handleVote = async (optionId: string) => {
    if (!poll) return;
    if (!currentUid) {
      toast.error("Sign in to vote");
      return;
    }
    setVoting(optionId);
    try {
      await votePostPoll(poll.id, optionId);
      setPoll({
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

  if (loading) {
    return (
      <div className="mx-4 flex items-center justify-center rounded-xl border p-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!poll) return null;

  const hasVoted = !!poll.myVoteOptionId;

  return (
    <div className="mx-4 space-y-2 rounded-xl border bg-card p-4">
      {poll.options.map(option => {
        const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
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
          </button>
        );
      })}

      <p className="text-xs text-muted-foreground">
        {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
        {poll.closed ? " · Closed" : ""}
      </p>
    </div>
  );
}
