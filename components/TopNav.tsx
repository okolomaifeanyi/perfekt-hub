"use client";

import { appInfo } from "@/lib/appInfo";
import { buttonVariants } from "./ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefObject } from "react";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import {
  // HomeIcon as HomeSolid,
  BellIcon as BellSolid,
  MagnifyingGlassIcon as SearchSolid,
  EnvelopeIcon as MailSolid,
  // UserGroupIcon as UsersSolid,
} from "@heroicons/react/24/solid";
import {
  // HomeIcon as HomeOutline,
  BellIcon as BellOutline,
  EnvelopeIcon as MailOutline,
  MagnifyingGlassIcon as SearchOutline,
  // UserGroupIcon as UsersOutline,
} from "@heroicons/react/24/outline";
import { Badge } from "./ui/badge";
import { usePathname } from "next/navigation";
import { useUnreadNotificationsCount } from "@/hooks/Notification";
import { useMessageBadge } from "@/hooks/useMessageBagde";
import { MobileMenu } from "./MobileMenu";

interface NavItemProps {
  href: string;
  label: string;
  SolidIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  OutlineIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badgeCount?: number;
}

const NavItem = ({
  href,
  SolidIcon,
  OutlineIcon,
  badgeCount,
}: NavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`${buttonVariants({
        variant: "secondary",
        size: "icon",
      })} py-1 px-2.5 relative`}
    >
      {isActive ? (
        <SolidIcon className="size-5 text-foreground relative" />
      ) : (
        <OutlineIcon className="size-5 text-foreground relative" />
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

const TopNav = ({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
}) => {
  const hidden = useHideOnScroll(scrollRef);
  const count = useUnreadNotificationsCount();
  const msgBadge = useMessageBadge();

  return (
    <motion.nav
      initial={false}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="z-50 flex justify-between items-center px-4 h-12 sticky top-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-b shadow-sm w-full sm:hidden"
    >
      <Link href="/" className="text-primary font-bold">
        {appInfo.name}
      </Link>

      <div className="flex gap-2">
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
          badgeCount={msgBadge}
        />
        <NavItem
          href="/search"
          label="Search"
          SolidIcon={SearchSolid}
          OutlineIcon={SearchOutline}
        />

        <MobileMenu />
      </div>
    </motion.nav>
  );
};

export default TopNav;
