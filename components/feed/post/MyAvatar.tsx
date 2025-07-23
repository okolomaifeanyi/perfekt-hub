"use client"

import { Avatar } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";

const MyAvatar = ({
  src,
  alt,
  link,
  className,
  size = 45,
}: {
  src: string;
  alt: string;
  link?: string;
  className?: string;
  size?: number;
}) => {
  return (
    <Link
      href={`/${link}`}
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
        <Image src={src} alt={alt} width={500} height={500} />
      </Avatar>
    </Link>
  );
};

export default MyAvatar;
