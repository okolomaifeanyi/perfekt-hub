import React from "react";
import { Avatar } from "./ui/avatar";
import Image from "next/image";
import { userAltImageUrl } from "./UserAltImageUrl";
import { UserProps } from "@/lib/types";

const JustAvatar = ({
  user,
  size = 48,
}: {
  user: UserProps;
  size?: number;
}) => {
  const altImage = userAltImageUrl({ name: user.fullName || user.username });
  return (
    <Avatar
      style={{ height: `${size}px`, width: `${size}px` }}
      className="cursor-pointer"
    >
      <Image
        alt={`${user.fullName || user.username}'s avatar`}
        width={500}
        height={500}
        className="object-cover"
        src={user.photoURL || altImage}
      />
    </Avatar>
  );
};

export default JustAvatar;
