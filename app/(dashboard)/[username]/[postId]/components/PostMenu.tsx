"use client";

import { useState } from "react";
import { MoreVertical, Pin, Trash2, UserX, UserMinus, Ban } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./ConfirmDialog";

type PostMenuProps = {
  isOwner: boolean;
  isFriend?: boolean;
  isFollowing?: boolean;
  isPinned?: boolean;
  onDelete: () => void;
  onUnfriend: () => void;
  onUnfollow: () => void;
  onBlock: () => void;
  onPin: () => void;
};

export default function PostMenu({
  isOwner,
  isFriend,
  isFollowing,
  isPinned,
  onDelete,
  onUnfriend,
  onUnfollow,
  onBlock,
  onPin,
}: PostMenuProps) {
  const [openDialog, setOpenDialog] = useState<null | "delete" | "block">(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isOwner && (
            <>
              <DropdownMenuItem onSelect={() => setOpenDialog("delete")}>
                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                <span className="text-red-500">Delete Post</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPin}>
                <Pin className="mr-2 h-4 w-4" />
                {isPinned ? "Unpin Post" : "Pin Post"}
              </DropdownMenuItem>
            </>
          )}
          {!isOwner && (
            <>
              {isFriend && (
                <DropdownMenuItem onClick={onUnfriend}>
                  <UserX className="mr-2 h-4 w-4" />
                  Unfriend
                </DropdownMenuItem>
              )}
              {isFollowing && (
                <DropdownMenuItem onClick={onUnfollow}>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Unfollow
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => setOpenDialog("block")}>
                <Ban className="mr-2 h-4 w-4 text-red-500" />
                <span className="text-red-500">Block User</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={openDialog === "delete"}
        onOpenChange={v => setOpenDialog(v ? "delete" : null)}
        title="Delete Post?"
        description="This post will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        onConfirm={onDelete}
        destructive
      />

      <ConfirmDialog
        open={openDialog === "block"}
        onOpenChange={v => setOpenDialog(v ? "block" : null)}
        title="Block User?"
        description="You won’t see posts from this user again. They won’t be notified."
        confirmText="Block"
        onConfirm={onBlock}
        destructive
      />
    </>
  );
}
