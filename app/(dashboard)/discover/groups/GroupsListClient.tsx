"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { joinGroup, type GroupProps } from "@/app/actions/groups";
import { useUserStore } from "@/lib/store/useUserStore";

export function GroupsListClient({ groups }: { groups: GroupProps[] }) {
  const currentUid = useUserStore(state => state.user?.uid);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  if (groups.length === 0) {
    return (
      <Card className="py-8">
        <CardContent className="text-center text-sm text-muted-foreground">
          No groups yet — be the first to create one.
        </CardContent>
      </Card>
    );
  }

  const handleJoin = async (groupId: string) => {
    setJoinedIds(prev => new Set(prev).add(groupId));
    try {
      await joinGroup(groupId);
      toast.success("Joined group");
    } catch {
      setJoinedIds(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
      toast.error("Failed to join group");
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map(group => {
        const isDone = joinedIds.has(group.id) || group.ownerUid === currentUid;
        return (
          <Card key={group.id} className="py-5">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">{group.name}</CardTitle>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                {group.membersCount} member{group.membersCount === 1 ? "" : "s"}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.description && (
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {group.description}
                </p>
              )}
              <Button
                size="sm"
                variant={isDone ? "outline" : "default"}
                disabled={isDone}
                onClick={() => handleJoin(group.id)}
              >
                {isDone ? "Joined" : "Join"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
