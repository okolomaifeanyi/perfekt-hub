"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import MyAvatar from "./feed/post/MyAvatar";
import { useUserStore } from "@/lib/store/useUserStore";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutClient } from "@/app/(auth)/lib/utils";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { List } from "./Typography";
import { navItems } from "@/lib/utils/navbar";

export function MobileMenu() {
  const currentUser = useUserStore(state => state.user);
  const { setGlobalLoading } = useUserStore(state => state);

  const router = useRouter();
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="pt-12 px-2 pb-2 w-full flex flex-col justify-between">
        <SheetHeader className="hidden">
          <SheetTitle className="hidden">Mobile navigation</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <Card className="py-2">
            <CardContent className="flex gap-x-2 items-center px-2">
              {currentUser?.username && (
                <MyAvatar
                  username={currentUser?.username}
                  photoURL={currentUser?.photoURL}
                  fullName={currentUser.fullName}
                  size={60}
                />
              )}

              <div className="space-y-1.5 flex flex-col">
                <p className="text-lg px-1">
                  {currentUser?.fullName || currentUser?.username}
                </p>

                <Link
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  href={`/${currentUser?.username}`}
                >
                  View your profile
                </Link>
              </div>
            </CardContent>
          </Card>

          <List className="list-none !mx-0">
            {navItems.map(({ href, label, SolidIcon, OutlineIcon }) => {
              const isActive = pathname === href;
              const Icon = isActive ? SolidIcon : OutlineIcon;
              return (
                <li key={label}>
                  <SheetClose asChild>
                    <Link
                      href={href}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-5" />
                        <span>{label}</span>
                      </div>
                      <ChevronRightIcon className="size-5" />
                    </Link>
                  </SheetClose>
                </li>
              );
            })}
            {/* <li>
              <SheetClose asChild>
              <Link href="/settings" className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-accent/50">
                <span>Settings and Privacy</span>
                <ChevronRightIcon className="size-5" />
              </Link></SheetClose>
            </li> */}
          </List>
        </div>

        <Button
          onClick={() => {
            setGlobalLoading(true);
            logoutClient(router);
          }}
          variant="destructive"
          className="w-full"
        >
          Logout
        </Button>
      </SheetContent>
    </Sheet>
  );
}
