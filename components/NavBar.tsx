"use client";

import {
  Bell,
  // Heart,
  Home,
  Mail,
  // Search,
  // Store,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AccountMenu } from "./AccountMenu";
import { Avatar } from "./ui/avatar";
import Image from "next/image";
import { useUserStore } from "@/lib/store/useUserStore";
import { userAltImageUrl } from "./UserAltImageUrl";
import { useUnreadNotificationsCount } from "@/hooks/Notification";
import { Badge } from "./ui/badge";

const NavBar = () => {
  const { user } = useUserStore(state => state);
  const count = useUnreadNotificationsCount();

  if (!user) return null;

  const altImage = userAltImageUrl({ name: user.username || "User" });

  return (
    <div className="flex flex-col py-14 h-screen justify-between px-4 items-center">
      <div className="flex flex-col space-y-6">
        <NavLink href="/" icon={<Home size={30} />} label="Home" />
        {/* <NavLink href="#" icon={<Search />} label="Search" /> */}
        <NavLink
          href="#"
          icon={
            <div className="relative">
              <Bell size={30} />
              {count > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                  {count}
                </Badge>
              )}
            </div>
          }
          label="Notification"
        />

        <NavLink href="#" icon={<Mail size={30} />} label="Message" />
        {/* <NavLink href="#" icon={<Heart />} label="Favourites" /> */}
        <NavLink href="#" icon={<Users size={30} />} label="Group" />
        {/* <NavLink href="#" icon={<Store />} label="Market" /> */}
        <NavLink
          href={`/${user.username}`}
          icon={<User size={30} />}
          label="Account"
        />
      </div>

      <div className="space-y-6 flex flex-col">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <Image
                src={user.photoURL || altImage}
                alt={`${user.username}'s avatar`}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            </Avatar>
          </DropdownMenuTrigger>
          <AccountMenu />
        </DropdownMenu>
      </div>
    </div>
  );
};

const NavLink = ({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <Link href={href} className="flex items-center md:space-x-4">
    {icon}
    <span className="hidden md:block">{label}</span>
  </Link>
);

export default NavBar;
