"use client";

import ConnectDropdown from "@/components/Connect";
import MyAvatar from "@/components/feed/post/MyAvatar";
// import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import FollowButton from "./FollowerButton";
import { UserProps } from "@/lib/types";

export default function FollowerRow({ user }: { user: UserProps }) {
  return (
    <li className="flex items-center justify-between p-3">
      <div className="flex items-center gap-3">
        <MyAvatar
          photoURL={user.photoURL}
          username={user.username}
          fullName={user.fullName}
        />
        <div>
          <div className="font-medium">{user.fullName}</div>
          <div className="text-xs text-muted-foreground">@{user.username}</div>
        </div>
        {/* {user.isFollowing && <Badge>Following</Badge>} */}
      </div>
      <ConnectDropdown targetUid={user.uid} />
    </li>
  );
}
