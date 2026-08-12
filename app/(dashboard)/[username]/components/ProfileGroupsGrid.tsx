"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getUserGroups, type GroupProps } from "@/app/actions/groups";
import RecommendationRail from "@/components/feed/RecommendationRail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userAltImageUrl } from "@/components/UserAltImageUrl";

export default function ProfileGroupsGrid({ uid }: { uid: string }) {
  const [groups, setGroups] = useState<GroupProps[] | null>(null);

  useEffect(() => {
    let active = true;
    void getUserGroups(uid)
      .then(result => {
        if (active) setGroups(result);
      })
      .catch(error => {
        console.warn("Failed to load groups", error);
        if (active) setGroups([]);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  if (groups === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="py-4">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-12 animate-pulse rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Groups you join will appear here.
        </p>
        <RecommendationRail type="groups" />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map(group => (
        <Link key={group.id} href={`/discover/groups/${group.id}`} className="block">
        <Card className="py-4 transition hover:bg-accent/40">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage
                  src={group.photoURL || userAltImageUrl({ name: group.name })}
                  alt={`${group.name} avatar`}
                />
                <AvatarFallback>{group.name.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <CardTitle className="truncate text-base">{group.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {group.membersCount} member{group.membersCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {group.description || "A group you belong to."}
            </p>
          </CardContent>
        </Card>
        </Link>
      ))}
    </div>
  );
}
