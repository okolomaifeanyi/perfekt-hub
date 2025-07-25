"use client";

import { Avatar } from "@/components/ui/avatar";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import Image from "next/image";
import Link from "next/link";

const MyAvatar = ({
  photoURL,
  className,
  size = 45,
  username,
  fullName,
}: {
  photoURL?: string;
  fullName?: string;
  username: string;
  className?: string;
  size?: number;
}) => {
  const altImage = userAltImageUrl({ name: fullName || username });
  return (
    <Link
      href={`/${username}`}
      className={`${className} z-10`}
      onClick={e => e.stopPropagation()}
    >
      <Avatar
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
        }}
        className="!m-0"
      >
        <Image
          src={photoURL || altImage}
          alt={`${fullName || username}'s avatar`}
          width={500}
          height={500}
        />
      </Avatar>
    </Link>
  );
};

export default MyAvatar;
