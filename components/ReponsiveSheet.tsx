"use client";

import { ReactNode } from "react";
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
//   modal?: boolean;
};

export const ResponsiveSheet = ({
  open,
  setOpen,
  children,
  title,
  desc,
  trigger,
//   modal,
}: ResponsiveSheetProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Always run hook, branch only in return
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="">
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
      //   modal={modal}
    >
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {desc && <DrawerDescription>{desc}</DrawerDescription>}
        </DrawerHeader>
        <div className="overflow-y-auto p-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
};
