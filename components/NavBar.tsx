"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { AccountMenu } from "./AccountMenu";
import { useUserStore } from "@/lib/store/useUserStore";
import { useUnreadNotificationsCount } from "@/hooks/Notification";
import { Badge } from "./ui/badge";
import JustAvatar from "./JustAvatar";

import {
  HomeIcon as HomeOutline,
  BellIcon as BellOutline,
  EnvelopeIcon as MailOutline,
  MagnifyingGlassIcon as DiscoverOutline,
  PlayIcon as WatchOutline,
  UserIcon as UserOutline,
  EllipsisHorizontalCircleIcon as MoreOutline,
} from "@heroicons/react/24/outline";

import {
  HomeIcon as HomeSolid,
  BellIcon as BellSolid,
  EnvelopeIcon as MailSolid,
  MagnifyingGlassIcon as DiscoverSolid,
  PlayIcon as WatchSolid,
  UserIcon as UserSolid,
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
  const router = useRouter();

  if (!user) return null;

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
      href: `/${user.username}`,
      label: "Profile",
      SolidIcon: UserSolid,
      OutlineIcon: UserOutline,
    },
  ];

  const moreItems = [
    { href: "/discover?q=groups", label: "Groups" },
    { href: "/discover?q=events", label: "Events" },
    { href: "/discover?q=match", label: "Suggested Match" },
    { href: "/discover?q=saved", label: "Saved" },
    { href: "/discover?q=calendar", label: "Calendar" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="flex h-screen flex-col justify-between px-4 py-14">
      <div className="flex flex-col space-y-6">
        {primaryNavItems.map(({ href, label, SolidIcon, OutlineIcon, badge }) => {
          const isProfile = label === "Profile";
          const isActive = isProfile
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === href || (href === "/discover" && pathname === "/search");
          const Icon = isActive ? SolidIcon : OutlineIcon;

          return (
            <Link
              key={label}
              href={href}
              className="flex items-center md:space-x-4"
            >
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
        })}

        {/* More dropdown — items already accessible on /discover
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-no-button-shadow
              className="flex items-center text-left md:space-x-4"
            >
              <MoreOutline className="size-8 text-foreground" />
              <span className="hidden md:block">More</span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" side="right" className="min-w-44">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Explore
            </div>
            {moreItems.map(item => (
              <DropdownMenuItem
                key={item.label}
                onSelect={event => {
                  event.preventDefault();
                  router.push(item.href);
                }}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        */}
      </div>

      <div className="space-y-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-no-button-shadow
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
