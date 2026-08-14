"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuTrigger } from "./ui/dropdown-menu";
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
  SparklesIcon as AssistantOutline,
  UserIcon as UserOutline,
} from "@heroicons/react/24/outline";

import {
  HomeIcon as HomeSolid,
  BellIcon as BellSolid,
  EnvelopeIcon as MailSolid,
  MagnifyingGlassIcon as DiscoverSolid,
  PlayIcon as WatchSolid,
  SparklesIcon as AssistantSolid,
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
