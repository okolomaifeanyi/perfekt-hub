import React from "react";
import { Avatar } from "./ui/avatar";
import Image from "next/image";
import { userAltImageUrl } from "./UserAltImageUrl";
import { UserProps } from "@/lib/types";

const JustAvatar = ({
  user,
  size = 48,
  photoURL,
  username,
  fullName,
}: {
  user?: UserProps | null;
  size?: number;
  photoURL?: string;
  username?: string;
  fullName?: string;
}) => {
  const altImage = userAltImageUrl({
    name: user?.fullName || user?.username || "User",
  });
  return (
    <Avatar
      style={{ height: `${size}px`, width: `${size}px` }}
      className="cursor-pointer"
    >
      <Image
        alt={fullName || username || `${user?.fullName || user?.username}'s avatar` || "User's avatar"}
        width={500}
        height={500}
        className="object-cover"
        src={photoURL || user?.photoURL || altImage}
      />
    </Avatar>
  );
};

export default JustAvatar;
