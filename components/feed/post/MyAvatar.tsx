"use client";

import { Avatar } from "@/components/ui/avatar";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import Image from "next/image";
import Link from "next/link";

const dataImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAyklEQVR4AYTKq4oCYRjG8b/CzsrCwu6mSbsraPCAJqNJTCLYvACryaDVGzFZTHaLoKBBvQMRDSIexgM4g87pGw/liz7wwsvz/Pzei/i5x3Q9mvMrtfGJSndLY3TEcrz7Ak/QXpoMbB/1xAfVuI/O7ExrtJdgsrFwDAtN09ANA+EKhlNdAs+wuexM+geF3uYN5yIQtitBRlUoBwXFyBeFcIBS1Caf/JYgF/nEsQSLlcb6oBNQ3smnfiR4fOmYSuhXJRb+I5v6f1TPuwEAAP//IuVqRgAAAAZJREFUAwBLeGnx3hCf3gAAAABJRU5ErkJggg==";

const MyAvatar = ({
  photoURL,
  className,
  size = 45,
  username,
  fullName,
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
