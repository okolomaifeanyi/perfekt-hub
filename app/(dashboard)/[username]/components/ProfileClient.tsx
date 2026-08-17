"use client";

import { useState } from "react";
import { useUserStore } from "@/lib/store/useUserStore";
import { UserProps } from "@/lib/types";
import Avatar from "./Avatar";
import Actions from "./Actions";
import { StatCard } from "./StatsCard";
import { Separator } from "@/components/ui/separator";
import ProfileTab from "./ProfileTab";
import ProfileCompletionCard from "./ProfileCompletionCard";
import { useUserCounts } from "@/hooks/useUserCounts";

const ProfileClient = ({ profile }: { profile: UserProps }) => {
  const { user } = useUserStore();
  const [openEdit, setOpenEdit] = useState(false);

  const isMe = user?.uid === profile.uid;

  const counts = useUserCounts(profile.uid, {
    followers: profile.followersCount,
    following: profile.followingCount,
    friends: profile.friendsCount,
    posts: profile.postsCount,
  });

  return (
    <div className="px-4 pb-24">
      <div className="-mt-[30px] flex justify-between items-start">
        <Avatar uid={profile.uid} />
        <Actions isMe={isMe} profile={profile} openEdit={openEdit} setOpenEdit={setOpenEdit} />
      </div>

      <div className="space-y-1.5 mt-4">
        {isMe && (
          // useUserStore's own user object, not the `profile` prop — that
          // prop is a one-time server-render snapshot with nothing to
          // invalidate it, so after saving Edit Profile it kept showing the
          // pre-save percentage until a full reload. The store's own user
          // is kept fresh by startUserListener's realtime subscription
          // (started app-wide on login), so falling back to `profile` only
          // matters for the brief window before that first snapshot lands.
          <ProfileCompletionCard profile={user ?? profile} onEdit={() => setOpenEdit(true)} />
        )}

        {profile.bio && (
          <p className="mt-4 max-w-2xl text-xs leading-relaxed">
            {profile.bio}
          </p>
        )}

        {profile.createdAt && (
          <p className="text-xs leading-relaxed text-gray-400">
            Joined{" "}
            {profile.createdAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          label="Followers"
          value={counts.followers}
          href={`/${profile.username}/followers`}
        />

        <StatCard
          label="Following"
          value={counts.following}
          href={`/${profile.username}/following`}
        />

        <StatCard
          label="Friends"
          value={counts.friends}
          href={`/${profile.username}/friends`}
        />

        <StatCard label="Posts" value={counts.posts} href={`#posts`} />
      </div>

      <Separator className="my-6" />

      <ProfileTab profile={profile} />
    </div>
  );
};

export default ProfileClient;
