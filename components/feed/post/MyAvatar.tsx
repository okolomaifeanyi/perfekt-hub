"use client";

import { Avatar } from "@/components/ui/avatar";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import { dataImage } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const MyAvatar = ({
  photoURL,
  username,
  fullName,
  className,
  size = 45,
}: {
  photoURL?: string;
  fullName?: string;
  username?: string;
  className?: string;
  size?: number;
}) => {
  const altImage = userAltImageUrl({ name: fullName || username || "User" });

  return (
    <Link
      href={`/${username}` || "User"}
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
          src={photoURL || dataImage || altImage}
          alt={`${fullName || username}'s avatar` || "User's avatar"}
          width={70}
          height={70}
          className="object-cover"
          loading="eager"
          priority={true}
          blurDataURL={dataImage}
          placeholder="blur"
        />
      </Avatar>
    </Link>
  );
};

export default MyAvatar;
