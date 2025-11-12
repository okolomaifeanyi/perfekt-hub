// components/DeleteAccountModal.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/store/useUserStore";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useState } from "react";
import { deleteAccountAction } from "@/app/actions/account";
import { BackwardIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export function DeleteAccountModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = useUserStore(s => s.user);
  const router = useRouter();

  const handleDelete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await deleteAccountAction(user.uid);
      router.push("/login");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-accent/50">
          <span className="space-x-2 flex items-center">
            <BackwardIcon className="size-5" />
            <span>Delete Account</span>
          </span>

          <ChevronRightIcon className="size-5" />
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Account?</DialogTitle>
          <DialogDescription>
            This will permanently delete your account, posts, and data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 justify-end">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Forever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
