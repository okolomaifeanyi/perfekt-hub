"use client";

import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AccountMenu } from "./AccountMenu";
import { useUserStore } from "@/lib/store/useUserStore";
import { useUnreadNotificationsCount } from "@/hooks/Notification";
import { Badge } from "./ui/badge";
import { usePathname } from "next/navigation";

// Heroicons
import {
  HomeIcon as HomeOutline,
  BellIcon as BellOutline,
  EnvelopeIcon as MailOutline,
  UserGroupIcon as UsersOutline,
  UserIcon as UserOutline,
} from "@heroicons/react/24/outline";

import {
  HomeIcon as HomeSolid,
  BellIcon as BellSolid,
  EnvelopeIcon as MailSolid,
  UserGroupIcon as UsersSolid,
  UserIcon as UserSolid,
} from "@heroicons/react/24/solid";
import JustAvatar from "./JustAvatar";

const NavBar = () => {
  const { user } = useUserStore(state => state);
  const count = useUnreadNotificationsCount();
  const pathname = usePathname();

  if (!user) return null;

  const navItems = [
    {
      href: "/",
      label: "Home",
      SolidIcon: HomeSolid,
      OutlineIcon: HomeOutline,
    },
    {
      href: "/notifications",
      label: "Notification",
      SolidIcon: BellSolid,
      OutlineIcon: BellOutline,
      badge: count,
    },
    {
      href: "/messages",
      label: "Message",
      SolidIcon: MailSolid,
      OutlineIcon: MailOutline,
    },
    {
      href: "/group",
      label: "Group",
      SolidIcon: UsersSolid,
      OutlineIcon: UsersOutline,
    },
    {
      href: `/${user.username}`,
      label: "Me",
      SolidIcon: UserSolid,
      OutlineIcon: UserOutline,
    },
  ];

  return (
    <div className="flex flex-col py-14 h-screen justify-between px-4 items-center">
      <div className="flex flex-col space-y-6">
        {navItems.map(({ href, label, SolidIcon, OutlineIcon, badge }) => {
          const isActive = pathname === href;
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
                  className={`absolute -top-1.5 -right-1 h-5 min-w-5 rounded-full px-1 font-mono tabular-nums
                ${!badge || badge === 0 ? "invisible" : ""}`}
                >
                  {badge ?? 0}
                </Badge>
              </div>

              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Account menu */}
      <div className="space-y-6 flex flex-col">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span className="flex gap-2 items-center">
              <JustAvatar
                size={32}
                photoURL={user?.photoURL}
                username={user?.username}
                fullName={user?.fullName}
              />
              <span className="hidden md:block">Accounts</span>
            </span>
          </DropdownMenuTrigger>
          <AccountMenu />
        </DropdownMenu>
      </div>
    </div>
  );
};

export default NavBar;
