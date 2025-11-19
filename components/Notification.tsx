"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useUnreadNotificationsCount,
  useNotifications,
} from "@/hooks/Notification";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BellIcon,
  Cog6ToothIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/solid";
import { Notification } from "@/lib/types";
import { getCompactTimeAgo } from "./utils";
import { H1, H2, P } from "./Typography";
import ConnectDropdown from "./Connect";
import { Avatar } from "./ui/avatar";
import Image from "next/image";
import { userAltImageUrl } from "./UserAltImageUrl";
import Back from "@/app/(dashboard)/[username]/components/Back";
import { PenIcon } from "lucide-react";

const getNotificationMeta = (n: Notification) => {
  switch (n.type) {
    case "like":
      return {
        icon: <HandThumbUpIcon className="w-4 h-4 text-red-500" />,
        link: `/${n?.actor?.username}/${n.postId}`,
        message: "liked your post",
      };
    case "dislike":
      return {
        icon: <HandThumbDownIcon className="w-4 h-4 text-gray-500" />,
        link: `/${n?.actor?.username}/${n.postId}`,
        message: "disliked your post",
      };
    case "reply":
      return {
        icon: <ArrowUturnLeftIcon className="w-4 h-4 text-blue-500" />,
        link: `/${n?.actor?.username}/${n.postId}`,
        message: "replied to your post",
      };
    case "mention":
      return {
        icon: <ChatBubbleLeftRightIcon className="w-4 h-4 text-purple-500" />,
        link: `/${n?.actor?.username}/${n.postId}`,
        message: "mentioned you",
      };
    case "follow":
      return {
        icon: <UserPlusIcon className="w-4 h-4 text-green-500" />,
        link: `/${n?.actor?.username}`,
        message: "started following you",
      };
    case "friendRequest":
      return {
        icon: <UserPlusIcon className="w-4 h-4 text-green-500" />,
        link: `/${n?.actor?.username}`,
        message: "sent you a friend request",
      };
    case "acceptRequest":
      return {
        icon: <CheckCircleIcon className="w-4 h-4 text-green-500" />,
        link: `/${n?.actor?.username}`,
        message: "accepted your friend request",
      };
    case "quote":
      return {
        icon: <PenIcon className="w-4 h-4 text-green-500" />,
        link: `/${n?.actor?.username}/${n.postId}`,
        message: "quoted your post",
      };
    default:
      return {
        icon: <BellIcon className="w-4 h-4" />,
        link: "/notifications",
        message: "sent you a notification",
      };
  }
};

const NotificationPage = () => {
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  const unreadCount = useUnreadNotificationsCount();
  const router = useRouter();

  const [filter, setFilter] = useState<"all" | "mentions" | "unread">("all");

  // ✅ Auto mark all as read once the page loads
  useEffect(() => {
    if (notifications.length > 0) {
      markAllAsRead();
    }
  }, [notifications, markAllAsRead]);

  // 🔹 Apply filter
  const filtered = notifications.filter((n: Notification) => {
    if (filter === "mentions") return n.type === "mention";
    if (filter === "unread") return !n.read;
    return true;
  });

  // 🔹 Group by date
  const grouped = filtered.reduce<Record<string, Notification[]>>((acc, n) => {
    const date = new Date(n.createdAt);
    const today = new Date();
    let group = "Earlier";

    if (date.toDateString() === today.toDateString()) {
      group = "Today";
    } else if (date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      group = "This Week";
    }

    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto p-4 mb-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Back />
        <H1 className="text-xl flex items-center gap-x-2">
          Notifications
          {unreadCount > 0 && (
            <span className="text-sm text-muted-foreground">
              ({unreadCount})
            </span>
          )}
        </H1>

        <div className="flex gap-1">
          <Button size="sm" variant="ghost">
            <Cog6ToothIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 text-sm">
        <Button
          size="sm"
          variant={filter === "all" ? "secondary" : "ghost"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={filter === "mentions" ? "secondary" : "ghost"}
          onClick={() => setFilter("mentions")}
        >
          Mentions
        </Button>

        <Button
          size="sm"
          variant={filter === "unread" ? "secondary" : "ghost"}
          onClick={() => setFilter("unread")}
        >
          Unread
        </Button>
      </div>

      {/* Notification Groups */}
      {Object.keys(grouped).length === 0 ? (
        <P className="text-center text-muted-foreground mt-10">
          No {filter} notifications
        </P>
      ) : (
        Object.keys(grouped).map(group => (
          <div key={group} className="mb-6">
            <H2 className="text-sm font-medium text-muted-foreground mb-2">
              {group}
            </H2>
            <div className="space-y-2 flex flex-col gap-y-1">
              {grouped[group].map((n: Notification) => {
                const meta = getNotificationMeta(n);
                const altImage = userAltImageUrl({
                  name: n?.actor?.fullName || n?.actor?.username || "Deleted User",
                });

                const handleClick = async (e: React.MouseEvent) => {
                  e.preventDefault();
                  if (!n.read) {
                    await markAsRead(n.id); // 🔹 update DB/state
                  }
                  router.push(meta.link); // 🔹 navigate
                };

                return (
                  <Card
                    key={n.id}
                    onClick={handleClick}
                    className={`p-3 hover:bg-muted transition cursor-pointer ${
                      !n.read ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className="flex gap-x-4 items-center">
                      <div className="relative">
                        <Avatar className="h-[40px] w-[40px]">
                          <Image
                            alt={`${
                              n?.actor?.fullName || n?.actor?.username || "Deleted User"
                            }'s avatar`}
                            width={500}
                            height={500}
                            className="object-cover"
                            src={n?.actor?.photoURL || altImage}
                          />
                        </Avatar>

                        <span className="absolute rounded-full -bottom-2 -right-2 bg-muted p-1">
                          {meta.icon}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col gap-y-2">
                        <P className="text-sm">
                          <strong>
                            {n.actor?.fullName || n.actor?.username || "Someone"}
                          </strong>{" "}
                          {meta.message}
                        </P>

                        {(n.type === "friendRequest" ||
                          n.type === "acceptRequest" ||
                          n.type === "follow") && (
                          <div>
                            <ConnectDropdown targetUid={n.actorUid} />
                          </div>
                        )}
                      </div>
                      <small className="text-muted-foreground">
                        {getCompactTimeAgo(n.createdAt)}
                      </small>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      <Separator className="my-6" />

      {/* Footer / Pagination */}
      <div className="flex justify-center">
        <Button variant="outline">Load more</Button>
      </div>
    </div>
  );
};

export default NotificationPage;
