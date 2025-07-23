"use client";

import { userAltImageUrl } from "@/components/UserAltImageUrl";
import { useUserStore } from "@/lib/store/useUserStore";
import NavBar from "./components/NavBar";
import Image from "next/image";
import { Large, Muted } from "@/components/Typography";
import MyAvatar from "@/components/feed/post/MyAvatar";

const UserClient = () => {
  const user = useUserStore(state => state.user);

  if (!user) return <p className="p-4">Loading user...</p>;

  const altImage = userAltImageUrl({ name: user.username || "User" });
  return (
    <div>
      <NavBar title={`${user.fullName}`} />
      <div className="h-[200px] relative">
        <Image
          src={`https://picsum.photos/seed/${user.username}/600/300`}
          alt="Wall"
          width={300}
          height={300}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="-mt-20 flex justify-center">
        <div className="!text-center">
          <MyAvatar
            src={user.photoURL || altImage}
            alt={`${user.username}'s avatar`}
            link={user.username}
            size={200}
          />

          {user.fullName && (
            <Large>
              <strong>{user.fullName}</strong>
            </Large>
          )}

          <Muted>@{user.username}</Muted>
        </div>
      </div>
    </div>
  );
};

export default UserClient;
