"use client";

import { useFollowers } from "@/hooks/useFollowers";
import { Loader2 } from "lucide-react";
import FollowerRow from "../followers/FollowerRow";

export function FollowerList({
  userId,
  type,
}: {
  userId: string;
  type: "followers" | "following" | "friends";
}) {
  const { followers, loading } = useFollowers(userId, type);

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  if (!followers.length) {
    return (
      <p className="text-center text-muted-foreground py-8">No {type} yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {followers.map(user => {

        return <FollowerRow key={user.uid} user={user} />;
      })}
    </div>
  );
}
