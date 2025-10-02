import React from "react";
import { Avatar } from "./ui/avatar";
import Image from "next/image";
import { userAltImageUrl } from "./UserAltImageUrl";
import { UserProps } from "@/lib/types";

const JustAvatar = ({
  user,
  size,
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
      className={`relative ${
        size ? "" : "w-24 h-24 sm:w-28 sm:h-28"
      }`}
      style={size ? { width: size, height: size } : {}}
    >
      <Image
        alt={
          fullName ||
          username ||
          `${user?.fullName || user?.username || "user"}'s avatar` ||
          "User's avatar"
        }
        src={photoURL || user?.photoURL || altImage}
        fill
        sizes={size ? `${size}px` : "(max-width: 768px) 80px, 120px"}
        className="object-cover"
      />
    </Avatar>
  );
};

export default JustAvatar;
