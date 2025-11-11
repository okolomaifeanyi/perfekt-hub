import React from "react";
import UserCard from "./UserCard";
import { UserProps } from "@/lib/types";
import MyAvatar from "./feed/post/MyAvatar";
import Link from "next/link";
import Name from "./feed/post/Name";

const AvatarHoverCard = ({ user }: { user: UserProps }) => {
  return (
    <UserCard user={user}>
      <div className="flex space-x-2">
        <MyAvatar
          photoURL={user?.photoURL}
          username={user?.username}
          fullName={user?.fullName}
        />

        <Link href={`/${user?.username}`}>
          <Name fullName={user?.fullName} username={user?.username || "user"} />
        </Link>
      </div>
    </UserCard>
  );
};

export default AvatarHoverCard;
