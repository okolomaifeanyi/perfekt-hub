"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PostComposer from "@/components/post-composer/PostComposer";
import type { OptimisticCallbacks } from "@/lib/types";

export default function ComposePostDialog({
  open,
  onOpenChange,
  optimistic,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  optimistic?: OptimisticCallbacks;
  isSubmitting?: boolean;
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
              onSuccess={() => onOpenChange(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
