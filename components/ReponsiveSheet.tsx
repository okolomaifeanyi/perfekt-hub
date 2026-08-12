"use client";

import { ReactNode } from "react";
import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type ResponsiveSheetProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  children: ReactNode;
  title: string;
  desc?: string;
  trigger?: ReactNode;
  // When true, the sheet can only be dismissed via the explicit close
  // button — not by clicking outside or pressing Escape. Use for flows that
  // must not be abandoned by accident (e.g. a required onboarding step).
  preventOutsideClose?: boolean;
//   modal?: boolean;
};

export const ResponsiveSheet = ({
  open,
  setOpen,
  children,
  title,
  desc,
  trigger,
  preventOutsideClose = false,
//   modal,
}: ResponsiveSheetProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Always run hook, branch only in return
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent
          className="bg-background"
          {...(desc ? {} : { "aria-describedby": undefined })}
          {...(preventOutsideClose
            ? {
                onInteractOutside: (e: Event) => e.preventDefault(),
                onEscapeKeyDown: (e: Event) => e.preventDefault(),
              }
            : {})}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {desc && <DialogDescription>{desc}</DialogDescription>}
          </DialogHeader>
          <div className="overflow-y-auto max-h-[80vh] sm:max-w-md px-4">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      dismissible={!preventOutsideClose}
      //   modal={modal}
    >
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent
        {...(preventOutsideClose
          ? { onInteractOutside: (e: Event) => e.preventDefault() }
          : {})}
      >
        <DrawerHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-0.5">
            <DrawerTitle>{title}</DrawerTitle>
            {desc && <DrawerDescription>{desc}</DrawerDescription>}
          </div>
          {preventOutsideClose && (
            <DrawerClose className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden">
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </DrawerClose>
          )}
        </DrawerHeader>
        <div className="overflow-y-auto p-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
};
