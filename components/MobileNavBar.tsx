"use client";

import { Home, Bell, Mail, Users, User } from "lucide-react";
import Link from "next/link";
import { useUserStore } from "@/lib/store/useUserStore";
import { useUnreadNotificationsCount } from "@/hooks/Notification";
import { Badge } from "./ui/badge";

const MobileNavBar = () => {
  const { user } = useUserStore();
  const count = useUnreadNotificationsCount();

  if (!user) return null;

  const navItems = [
    { href: "/", icon: <Home />, label: "Home" },
    {
      href: "#",
      icon: (
        <div className="relative">
          <Bell />
          {count > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] rounded-full">
              {count}
            </Badge>
          )}
        </div>
      ),
      label: "Notifications",
    },
    { href: "#", icon: <Mail />, label: "Messages" },
    { href: "#", icon: <Users />, label: "Groups" },
    { href: `/${user.username}`, icon: <User />, label: "Me" },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-sm">
      <div className="flex justify-between px-4 py-2">
        {navItems.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center justify-center text-sm
             hover:text-gray
            "
          >
            {item.icon}
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavBar;
