"use client";

import { ImagePlus } from "lucide-react";
import { useUserStore } from "@/lib/store/useUserStore";
import MyAvatar from "./post/MyAvatar";
import { cn } from "@/lib/utils";

// A full always-expanded composer (textarea + a row of toolbar buttons) at
// the very top of the feed is a lot to take in before a user has even
// decided to post — most sessions just want to scroll. This collapses that
// down to the one-line "what's on your mind" bar most social apps use;
// tapping it (or the photo shortcut) opens the same ComposePostDialog the
// floating compose button already uses, so there's still exactly one real
// composer implementation, just two doors into it.
export function ComposerTrigger({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  const user = useUserStore(state => state.user);
  if (!user) return null;

  return (
    <div className={cn("flex items-center gap-2 px-4", className)}>
      <MyAvatar username={user.username} photoURL={user.photoURL} fullName={user.fullName} size={40} />
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 rounded-full border bg-muted/40 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70"
      >
        What&apos;s on your mind?
      </button>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Add a photo or video"
        title="Add a photo or video"
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        <ImagePlus className="size-5" />
      </button>
    </div>
  );
}
