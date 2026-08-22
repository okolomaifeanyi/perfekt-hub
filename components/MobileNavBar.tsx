"use client";

import Link from "next/link";
import { useUserStore } from "@/lib/store/useUserStore";
import { useUnreadNotificationsCount } from "@/hooks/Notification";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { AccountMenu } from "./AccountMenu";
import { DropdownMenu } from "./ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import { userAltImageUrl } from "./UserAltImageUrl";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

// Heroicons
import {
  HomeIcon as HomeSolid,
  BellIcon as BellSolid,
  EnvelopeIcon as MailSolid,
  UserGroupIcon as UsersSolid,
} from "@heroicons/react/24/solid";
import {
  HomeIcon as HomeOutline,
  BellIcon as BellOutline,
  EnvelopeIcon as MailOutline,
  UserGroupIcon as UsersOutline,
} from "@heroicons/react/24/outline";
import { RefObject } from "react";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";

interface NavItemProps {
  href: string;
  label: string;
  SolidIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  OutlineIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badgeCount?: number;
}

const NavItem = ({
  href,
  label,
  SolidIcon,
  OutlineIcon,
  badgeCount,
}: NavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-label={label}
      className="flex flex-col items-center justify-center text-sm hover:text-gray relative"
    >
      {isActive ? (
        <SolidIcon className="size-6 text-foreground" />
      ) : (
        <OutlineIcon className="size-6 text-foreground" />
      )}
      {badgeCount !== undefined && (
        <Badge
          className={`absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] rounded-full
      ${badgeCount === 0 ? "invisible" : ""}`}
        >
          {badgeCount}
        </Badge>
      )}
    </Link>
  );
};

const MobileNavBar = ({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
}) => {
  const { user } = useUserStore();
  const count = useUnreadNotificationsCount();
  const hidden = useHideOnScroll(scrollRef);

  if (!user) return null;

  const altImage = userAltImageUrl({ name: user.fullName || user.username });

  return (
    <motion.nav
      initial={false}
      animate={{ y: hidden ? "100%" : "0%" }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="sm:hidden fixed bottom-0 z-50 bg-card border-t shadow-sm backdrop-blur-lg w-full"
    >
      <div className="flex justify-between px-4 py-2">
        <NavItem
          href="/"
          label="Home"
          SolidIcon={HomeSolid}
          OutlineIcon={HomeOutline}
        />
        <NavItem
          href="/notifications"
          label="Notification"
          SolidIcon={BellSolid}
          OutlineIcon={BellOutline}
          badgeCount={count}
        />
        <NavItem
          href="/messages"
          label="Message"
          SolidIcon={MailSolid}
          OutlineIcon={MailOutline}
        />
        <NavItem
          href="/group"
          label="Group"
          SolidIcon={UsersSolid}
          OutlineIcon={UsersOutline}
        />

        {/* Account dropdown stays separate */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <Image
                alt={`${user.fullName || user.username}'s avatar`}
                width={500}
                height={500}
                className="object-cover"
                src={user.photoURL || altImage}
              />
              <AvatarFallback>{user.username}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <AccountMenu />
        </DropdownMenu>
      </div>
    </motion.nav>
  );
};

export default MobileNavBar;
