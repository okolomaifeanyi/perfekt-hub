"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoCameraIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/button";
import ComposePostDialog from "@/components/feed/ComposePostDialog";
import { useUserStore } from "@/lib/store/useUserStore";
import type { MediaProps } from "@/lib/types";

// Jumps straight to the OS file picker (a real click, so no browser
// restriction on triggering it) instead of opening a blank composer the
// visitor would then have to tap Media in again — the chosen file seeds
// ComposePostDialog via initialMedia once it opens.
export default function AddVideoButton({
  // Viewer-facing pages (own profile's Videos tab, /watch) pass the profile
  // being viewed — the button only ever renders for its owner. Omit on
  // pages that are already implicitly "yours" (there's no one else's video
  // to add from there).
  targetUid,
  className,
  variant = "default",
  size = "default",
  label = "Add video",
}: {
  targetUid?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  label?: string;
}) {
  const currentUser = useUserStore(state => state.user);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialMedia, setInitialMedia] = useState<MediaProps[]>([]);

  if (!currentUser || (targetUid && currentUser.uid !== targetUid)) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setInitialMedia([{ file, src: URL.createObjectURL(file), type: "video" }]);
    setDialogOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        <VideoCameraIcon className="mr-1.5 size-4" />
        {label}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFile}
      />

      <ComposePostDialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) setInitialMedia([]);
        }}
        initialMedia={initialMedia}
        onPosted={() => router.refresh()}
      />
    </>
  );
}
