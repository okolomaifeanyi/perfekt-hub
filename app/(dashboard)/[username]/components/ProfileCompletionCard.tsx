"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProfileCompletion } from "@/lib/profile-completion.mjs";
import { UserProps } from "@/lib/types";

// Own-profile only (see ProfileClient's isMe check) — nobody else needs to
// know how filled-out your profile is, and showing it to visitors would
// just be noise on top of the same fields already visible in About.
export default function ProfileCompletionCard({
  profile,
  onEdit,
}: {
  profile: UserProps;
  onEdit: () => void;
}) {
  const { percent, missing, isComplete } = getProfileCompletion(profile);

  if (isComplete) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <p className="text-sm font-semibold">Your profile is {percent}% complete</p>
          </div>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Complete it
          </Button>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Add {missing.map(field => field.label).join(", ")} to get better matches, more
          relevant news, and more visibility across the app.
        </p>
      </CardContent>
    </Card>
  );
}
