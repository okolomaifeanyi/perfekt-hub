"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateGroupDigest } from "@/app/actions/groupDigest";
import type { GroupPostProps } from "@/app/actions/groups";

export function GroupCatchUpButton({ posts }: { posts: GroupPostProps[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && digest === null && !loading) {
      void handleGenerate();
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateGroupDigest(
        posts
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(p => ({ authorUsername: p.authorUsername, text: p.text, createdAt: p.createdAt }))
      );
      setDigest(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Sparkles className="mr-1.5 size-3.5" />
          Catch me up
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What you missed</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>{error}</p>
            <Button size="sm" variant="outline" onClick={() => void handleGenerate()}>
              Try again
            </Button>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{digest}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
