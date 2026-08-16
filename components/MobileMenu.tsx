"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, UserPlus2, X } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import MyAvatar from "./feed/post/MyAvatar";
import JustAvatar from "./JustAvatar";
import { useUserStore } from "@/lib/store/useUserStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutClient } from "@/app/(auth)/lib/utils";
import {
  ChevronRightIcon,
  CalendarIcon as EventsSolid,
  BookmarkIcon as SavesSolid,
  HeartIcon as MatchSolid,
  TagIcon as MarketplaceSolid,
} from "@heroicons/react/24/solid";
import {
  CalendarIcon as EventsOutline,
  BookmarkIcon as SavesOutline,
  HeartIcon as MatchOutline,
  TagIcon as MarketplaceOutline,
} from "@heroicons/react/24/outline";
import { List } from "./Typography";
import { navGroups as rawNavGroups } from "@/lib/utils/navbar";
import { useDiscoverAvailability } from "@/hooks/useDiscoverAvailability";
import {
  buildSavedAccountFromSession,
  readSavedAccounts,
  removeSavedAccount,
  rememberSavedAccount,
} from "@/lib/saved-accounts.mjs";
import { toast } from "sonner";

type SavedAccount = {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  photoURL: string;
  providerId: string;
  accessToken: string;
  refreshToken: string;
  lastUsedAt: string;
};

type NavIcon = React.ComponentType<{ className?: string }>;
type NavGroupItem = { href: string; label: string; SolidIcon?: NavIcon; OutlineIcon?: NavIcon };
type NavGroup = { label: string; items: NavGroupItem[] };

const navGroups = rawNavGroups as NavGroup[];
const PRIMARY_GROUP = navGroups.find(group => group.label === "Primary");

export function MobileMenu() {
  const currentUser = useUserStore(state => state.user);
  const { setGlobalLoading } = useUserStore(state => state);

  const router = useRouter();
  const pathname = usePathname();
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const availability = useDiscoverAvailability();

  useEffect(() => {
    setSavedAccounts(readSavedAccounts(window.localStorage));
  }, [currentUser?.uid]);

  // Each only shows once it actually has something in it — an empty-state
  // nav link invites a click into nothing (see useDiscoverAvailability).
  // Spliced in right after Discover, same placement as the desktop nav.
  const menuItems: NavGroupItem[] = [];
  for (const item of PRIMARY_GROUP?.items ?? []) {
    menuItems.push(item);
    if (item.label !== "Discover") continue;
    if (availability.events) {
      menuItems.push({ href: "/discover/events", label: "Events", SolidIcon: EventsSolid, OutlineIcon: EventsOutline });
    }
    if (availability.saves) {
      menuItems.push({ href: "/discover/saves", label: "Saves", SolidIcon: SavesSolid, OutlineIcon: SavesOutline });
    }
    if (availability.match) {
      menuItems.push({ href: "/discover/match", label: "Match", SolidIcon: MatchSolid, OutlineIcon: MatchOutline });
    }
    if (availability.marketplace) {
      menuItems.push({
        href: "/discover/products",
        label: "Marketplace",
        SolidIcon: MarketplaceSolid,
        OutlineIcon: MarketplaceOutline,
      });
    }
  }

  const handleSwitchAccount = async (account: SavedAccount) => {
    if (account.uid === currentUser?.uid) return;
    if (!account.accessToken || !account.refreshToken) {
      toast.error("Saved account is missing session data. Sign in again.");
      return;
    }

    setGlobalLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error, data } = await supabase.auth.setSession({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      });
      if (error) throw error;

      if (data.user && data.session) {
        rememberSavedAccount(window.localStorage, {
          ...buildSavedAccountFromSession({
            user: data.user,
            session: data.session,
            profile: {
              uid: data.user.id,
              email: data.user.email ?? "",
              username: account.username,
              fullName: account.fullName,
              photoURL: account.photoURL,
            },
          }),
          lastUsedAt: new Date().toISOString(),
        });
      }
      router.refresh();
    } catch (error) {
      console.error("Account switch failed:", error);
      toast.error("Could not switch account");
      setGlobalLoading(false);
    }
  };

  const handleRemoveAccount = (uid: string) => {
    removeSavedAccount(window.localStorage, uid);
    setSavedAccounts(readSavedAccounts(window.localStorage));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="pt-12 px-2 pb-2 w-full flex flex-col justify-between overflow-y-auto">
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

                <SheetClose asChild>
                  <Link
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    href={`/${currentUser?.username}`}
                  >
                    View your profile
                  </Link>
                </SheetClose>
              </div>
            </CardContent>
          </Card>

          <List className="list-none mx-0!">
            {menuItems.map(item => {
              const isActive = pathname === item.href;
              const Icon = isActive ? item.SolidIcon : item.OutlineIcon;
              return (
                <li key={item.label}>
                  <SheetClose asChild>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="size-5" />}
                        <span>{item.label}</span>
                      </div>
                      <ChevronRightIcon className="size-5" />
                    </Link>
                  </SheetClose>
                </li>
              );
            })}
          </List>

          {/* Accounts */}
          <div className="px-1 text-xs font-medium text-muted-foreground">
            Accounts
          </div>
          <List className="list-none mx-0! space-y-1">
            {savedAccounts.map(account => (
              <li key={account.uid} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchAccount(account)}
                  className="flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent/50"
                >
                  <JustAvatar
                    size={28}
                    username={account.username}
                    photoURL={account.photoURL || undefined}
                    fullName={account.fullName || undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {account.fullName || account.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{account.username}
                    </p>
                  </div>
                  {account.uid === currentUser?.uid && (
                    <span className="text-xs text-muted-foreground">Current</span>
                  )}
                </button>
                <button
                  type="button"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => handleRemoveAccount(account.uid)}
                  aria-label={`Remove ${account.username} from saved accounts`}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
            <li>
              <SheetClose asChild>
                <Link
                  href="/login?addAccount=1"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-accent/50"
                >
                  <UserPlus2 className="size-4" />
                  Add another account
                </Link>
              </SheetClose>
            </li>
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
