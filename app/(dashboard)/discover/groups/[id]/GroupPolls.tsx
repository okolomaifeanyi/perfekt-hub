"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, Lock, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPoll, votePoll, type PollProps } from "@/app/actions/polls";

function PollCard({
  poll,
  onVoted,
}: {
  poll: PollProps;
  onVoted: (updated: PollProps) => void;
}) {
  const [voting, setVoting] = useState<string | null>(null);
  const hasVoted = !!poll.myVoteOptionId;

  const handleVote = async (optionId: string) => {
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
    <Card className="py-4">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-base">{poll.question}</CardTitle>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {poll.anonymous && <Lock className="size-3.5" />}
          {poll.anonymous ? "Anonymous poll" : "Poll"} · {poll.totalVotes} vote
          {poll.totalVotes === 1 ? "" : "s"}
          {poll.closed && " · Closed"}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
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
              disabled={poll.closed || voting === option.id}
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
      </CardContent>
    </Card>
  );
}

function CreatePollDialog({
  groupId,
  onCreated,
}: {
  groupId: string;
  onCreated: (poll: PollProps) => void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setAnonymous(false);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const poll = await createPoll({
        groupId,
        question,
        options,
        anonymous,
      });
      toast.success("Poll created");
      onCreated(poll);
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create poll");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1.5 size-4" />
          New poll
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poll-question">Question</Label>
            <Input
              id="poll-question"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="What should we vote on?"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={e =>
                    setOptions(prev =>
                      prev.map((o, i) => (i === index ? e.target.value : o))
                    )
                  }
                  placeholder={`Option ${index + 1}`}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove option"
                    onClick={() =>
                      setOptions(prev => prev.filter((_, i) => i !== index))
                    }
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 8 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOptions(prev => [...prev, ""])}
              >
                <Plus className="mr-1.5 size-3.5" />
                Add option
              </Button>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={e => setAnonymous(e.target.checked)}
              className="size-4"
            />
            Anonymous voting — no one can see who voted for what
          </label>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? "Creating..." : "Create poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GroupPolls({
  groupId,
  initialPolls,
}: {
  groupId: string;
  initialPolls: PollProps[];
}) {
  const [polls, setPolls] = useState(initialPolls);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="size-4" />
          Polls
        </h2>
        <CreatePollDialog
          groupId={groupId}
          onCreated={poll => setPolls(prev => [poll, ...prev])}
        />
      </div>

      {polls.length === 0 ? (
        <Card className="py-8">
          <CardContent className="text-center text-sm text-muted-foreground">
            No polls yet — create one to gather the group&apos;s opinion.
          </CardContent>
        </Card>
      ) : (
        polls.map(poll => (
          <PollCard
            key={poll.id}
            poll={poll}
            onVoted={updated =>
              setPolls(prev => prev.map(p => (p.id === updated.id ? updated : p)))
            }
          />
        ))
      )}
    </div>
  );
}
