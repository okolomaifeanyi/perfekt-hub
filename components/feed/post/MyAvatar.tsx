"use client";

import ConnectDropdown from "@/components/Connect";
import JustAvatar from "@/components/JustAvatar";
import { Avatar } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import { useUserStore } from "@/lib/store/useUserStore";
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
  bio,
  createdAt,
  uid,
  followersCount,
  followingCount,
  friendsCount,
}: {
  photoURL?: string;
  fullName?: string;
  username?: string;
  className?: string;
  size?: number;
  bio?: string;
  createdAt?: Date | null;
  uid?: string;
  followersCount?: number;
  followingCount?: number;
  friendsCount?: number;
}) => {
  const altImage = userAltImageUrl({ name: fullName || username || "User" });

  const currentUser = useUserStore(state => state.user);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
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
      </HoverCardTrigger>
      <HoverCardContent className="w-64 sm:w-72">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between">
            <JustAvatar
              fullName={fullName}
              photoURL={photoURL}
              username={username}
            />
            {uid && uid !== currentUser?.uid && (
              <ConnectDropdown targetUid={uid} />
            )}
          </div>
          <div className="space-y-1 mb-4">
            <h4 className="text-sm font-semibold">
              {fullName || username || "User"}
            </h4>
            <p className="text-xs text-muted-foreground">
              @{username || "user"}
            </p>
          </div>
          <div className="pt-1 border-t space-y-3">
            {bio && (
              <p className="text-sm">
                <strong>{bio.length > 100 ? bio.slice(0, 100) + "..." : bio}</strong>
              </p>
            )}

            <div className="flex space-x-2 text-xs text-muted-foreground">
              <span>
                <strong className="text-white">{followersCount}</strong>{" "}
                Followers
              </span>

              <span>
                <strong className="text-white">{followingCount}</strong>{" "}
                Followings
              </span>

              <span>
                <strong className="text-white">{friendsCount}</strong>{" "}
                Friends
              </span>
            </div>

            {createdAt && (
              <div className="text-muted-foreground text-xs">
                Joined{" "}
                <strong className="text-white">{createdAt?.toLocaleDateString("en-UK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}</strong>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default MyAvatar;
