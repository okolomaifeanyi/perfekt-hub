"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import MyAvatar from "./feed/post/MyAvatar";
import { useUserStore } from "@/lib/store/useUserStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutClient } from "@/app/(auth)/lib/utils";

export function MobileMenu() {
  const currentUser = useUserStore(state => state.user);
  const { setGlobalLoading } = useUserStore(state => state);

  const router = useRouter();
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
              <p className="text-lg px-1">{currentUser?.fullName || currentUser?.username}</p>

              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={`/${currentUser?.username}`}
              >
                View your profile
              </Link>
            </div>
          </CardContent>
        </Card>

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
