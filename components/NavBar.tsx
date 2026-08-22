"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";
import { AccountMenu } from "./AccountMenu";
import { useUserStore } from "@/lib/store/useUserStore";
import { useUnreadNotificationsCount } from "@/hooks/Notification";
import { useDiscoverAvailability } from "@/hooks/useDiscoverAvailability";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import JustAvatar from "./JustAvatar";
import { appInfo } from "@/lib/appInfo";

import {
  HomeIcon as HomeOutline,
  BellIcon as BellOutline,
  EnvelopeIcon as MailOutline,
  MagnifyingGlassIcon as DiscoverOutline,
  PlayIcon as WatchOutline,
  SparklesIcon as AssistantOutline,
  UserIcon as UserOutline,
  CalendarIcon as EventsOutline,
  BookmarkIcon as SavesOutline,
  HeartIcon as MatchOutline,
  TagIcon as MarketplaceOutline,
  EllipsisHorizontalCircleIcon as MoreOutline,
} from "@heroicons/react/24/outline";

import {
  HomeIcon as HomeSolid,
  BellIcon as BellSolid,
  EnvelopeIcon as MailSolid,
  MagnifyingGlassIcon as DiscoverSolid,
  PlayIcon as WatchSolid,
  SparklesIcon as AssistantSolid,
  UserIcon as UserSolid,
  EllipsisHorizontalCircleIcon as MoreSolid,
} from "@heroicons/react/24/solid";

type NavItem = {
  href: string;
  label: string;
  SolidIcon: React.ComponentType<{ className?: string }>;
  OutlineIcon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

const NavBar = () => {
  const { user } = useUserStore(state => state);
  const count = useUnreadNotificationsCount();
  const pathname = usePathname();
  const availability = useDiscoverAvailability();

  // A signed-out visitor can still be on a public page (home feed,
  // discover, a shared post — see lib/public-routes.mjs), where this
  // returning null left the entire left column blank instead of showing
  // any navigation at all. A trimmed nav (just what's actually open to
  // them) plus a Sign in CTA in place of the account menu.
  if (!user) {
    return (
      <div className="flex h-screen flex-col justify-between px-4 py-14">
        <div className="flex flex-col space-y-6">
          <Link href="/" aria-label="Home" className="flex items-center md:space-x-4">
            <HomeOutline className="size-8 text-foreground" />
            <span className="hidden md:block">Home</span>
          </Link>
          <Link href="/discover" aria-label="Discover" className="flex items-center md:space-x-4">
            <DiscoverOutline className="size-8 text-foreground" />
            <span className="hidden md:block">Discover</span>
          </Link>
        </div>

        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/signup">Join {appInfo.name}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const primaryNavItems: NavItem[] = [
    {
      href: "/",
      label: "Home",
      SolidIcon: HomeSolid,
      OutlineIcon: HomeOutline,
    },
    {
      href: "/watch",
      label: "Watch",
      SolidIcon: WatchSolid,
      OutlineIcon: WatchOutline,
    },
    {
      href: "/discover",
      label: "Discover",
      SolidIcon: DiscoverSolid,
      OutlineIcon: DiscoverOutline,
    },
    {
      href: "/messages",
      label: "Messages",
      SolidIcon: MailSolid,
      OutlineIcon: MailOutline,
    },
    {
      href: "/notifications",
      label: "Notifications",
      SolidIcon: BellSolid,
      OutlineIcon: BellOutline,
      badge: count,
    },
    {
      href: "/assistant",
      label: "Nwanne",
      SolidIcon: AssistantSolid,
      OutlineIcon: AssistantOutline,
    },
    {
      href: `/${user.username}`,
      label: "Profile",
      SolidIcon: UserSolid,
      OutlineIcon: UserOutline,
    },
  ];

  // Secondary, conditional destinations — each only exists once it actually
  // has something in it (see useDiscoverAvailability). Grouped under one
  // "More" trigger instead of splicing straight into the primary list, so a
  // visitor with all four active doesn't end up with an 11-item sidebar.
  const moreNavItems: { href: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    ...(availability.events ? [{ href: "/discover/events", label: "Events", Icon: EventsOutline }] : []),
    ...(availability.match ? [{ href: "/discover/match", label: "Match", Icon: MatchOutline }] : []),
    ...(availability.saves ? [{ href: "/discover/saves", label: "Saves", Icon: SavesOutline }] : []),
    ...(availability.marketplace
      ? [{ href: "/discover/products", label: "Marketplace", Icon: MarketplaceOutline }]
      : []),
  ];
  const isMoreActive = moreNavItems.some(item => pathname === item.href);
  const MoreIcon = isMoreActive ? MoreSolid : MoreOutline;

  const renderNavItem = ({ href, label, SolidIcon, OutlineIcon, badge }: NavItem) => {
    const isProfile = label === "Profile";
    const isActive = isProfile
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === href || (href === "/discover" && pathname === "/search");
    const Icon = isActive ? SolidIcon : OutlineIcon;

    return (
      <Link key={label} href={href} aria-label={label} className="flex items-center md:space-x-4">
        <div className="relative">
          <Icon className="size-8 text-foreground" />
          <Badge
            className={`absolute -top-1.5 -right-1 h-5 min-w-5 rounded-full px-1 font-mono tabular-nums ${
              !badge || badge === 0 ? "invisible" : ""
            }`}
          >
            {badge ?? 0}
          </Badge>
        </div>

        <span className="hidden md:block">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen flex-col justify-between px-4 py-14">
      <div className="flex flex-col space-y-6">
        {primaryNavItems.map(renderNavItem)}

        {moreNavItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" data-no-button-shadow aria-label="More" className="flex items-center md:space-x-4">
                <MoreIcon className="size-8 text-foreground" />
                <span className="hidden md:block">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {moreNavItems.map(({ href, label, Icon }) => (
                <DropdownMenuItem key={label} asChild>
                  <Link href={href} className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-no-button-shadow
              aria-label="Accounts"
              className="flex w-full items-center rounded-md px-2 py-1 text-left transition hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none md:space-x-4"
            >
              <JustAvatar
                size={32}
                photoURL={user?.photoURL}
                username={user?.username}
                fullName={user?.fullName}
              />
              <span className="hidden md:block">Accounts</span>
            </button>
          </DropdownMenuTrigger>
          <AccountMenu />
        </DropdownMenu>
      </div>
    </div>
  );
};

export default NavBar;
