"use client"

import { useUserStore } from "@/lib/store/useUserStore";
import { UserProps } from "@/lib/types";
import Avatar from "./Avatar";
import Actions from "./Actions";
import { StatCard } from "./StatsCard";
import { Separator } from "@/components/ui/separator";
import ProfileTab from "./ProfileTab";
import { useUserCounts } from "@/hooks/useUserCounts";

const ProfileClient = ({ profile }: { profile: UserProps }) => {
  const { user } = useUserStore();

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
        <Avatar profile={profile} />
        <Actions isMe={isMe} profile={profile} />
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed">{profile.bio}</p>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          label="Followers"
          value={counts.followers}
          // href={`/${profile.username}?tab=followers`}
        />
        <StatCard
          label="Following"
          value={counts.following}
          // href={`/${profile.username}?tab=following`}
        />
        <StatCard
          label="Friends"
          value={counts.friends}
          // href={`/${profile.username}?tab=friends`}
        />
        <StatCard
          label="Posts"
          value={counts.posts}
          // href={`/${profile.username}?tab=posts`}
        />
      </div>

      <Separator className="my-6" />

      <ProfileTab profile={profile} isMe={isMe} />
    </div>
  );
};

export default ProfileClient;
