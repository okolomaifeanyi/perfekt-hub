"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PostComposer from "@/components/post-composer/PostComposer";
import type { MediaProps, OptimisticCallbacks } from "@/lib/types";

export default function ComposePostDialog({
  open,
  onOpenChange,
  optimistic,
  isSubmitting,
  initialMedia,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  optimistic?: OptimisticCallbacks;
  isSubmitting?: boolean;
  initialMedia?: MediaProps[];
  // Fires (in addition to the dialog always closing) once the post actually
  // sends — lets a caller with no feed of its own to optimistically update
  // (e.g. AddVideoButton on /watch or a profile's Videos tab) refresh its
  // server data instead of the new post silently not appearing anywhere.
  onPosted?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-hidden p-0">
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader className="text-left">
            <DialogTitle>Compose post</DialogTitle>
            <DialogDescription>
              Share an update, photo, video, or link.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <PostComposer
              autoFocusTextArea
              optimistic={optimistic}
              isSubmitting={isSubmitting}
              initialMedia={initialMedia}
              onSuccess={() => {
                onOpenChange(false);
                onPosted?.();
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
