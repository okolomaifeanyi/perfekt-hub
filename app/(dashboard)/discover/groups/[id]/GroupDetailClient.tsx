"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, LogOut, MoreVertical, ShieldMinus, ShieldPlus, UserMinus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/lib/store/useUserStore";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import {
  joinGroup,
  leaveGroup,
  removeMember,
  setMemberRole,
  type GroupDetail,
  type GroupMemberProps,
} from "@/app/actions/groups";
import type { PollProps } from "@/app/actions/polls";
import { GroupSettingsDialog } from "./GroupSettingsDialog";
import { GroupPolls } from "./GroupPolls";

export function GroupDetailClient({
  detail,
  initialPolls,
}: {
  detail: GroupDetail;
  initialPolls: PollProps[];
}) {
  const router = useRouter();
  const currentUid = useUserStore(state => state.user?.uid);
  const [members, setMembers] = useState<GroupMemberProps[]>(detail.members);
  const [membersCount, setMembersCount] = useState(detail.group.membersCount);
  const [busy, setBusy] = useState(false);

  const myRole = members.find(m => m.uid === currentUid)?.role ?? null;
  const isMember = !!myRole;
  const isAdmin = myRole === "admin";

  const handleJoin = async () => {
    setBusy(true);
    try {
      await joinGroup(detail.group.id);
      toast.success("Joined group");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join group");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm(`Leave "${detail.group.name}"?`)) return;
    setBusy(true);
    try {
      await leaveGroup(detail.group.id);
      toast.success("Left group");
      router.push("/discover/groups");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave group");
      setBusy(false);
    }
  };

  const handleRemove = async (targetUid: string) => {
    if (!confirm("Remove this member from the group?")) return;
    try {
      await removeMember(detail.group.id, targetUid);
      setMembers(prev => prev.filter(m => m.uid !== targetUid));
      setMembersCount(prev => Math.max(0, prev - 1));
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    }
  };

  const handleRoleChange = async (targetUid: string, role: "admin" | "member") => {
    try {
      await setMemberRole(detail.group.id, targetUid, role);
      setMembers(prev => prev.map(m => (m.uid === targetUid ? { ...m, role } : m)));
      toast.success(role === "admin" ? "Promoted to admin" : "Removed as admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {detail.group.photoURL && <AvatarImage src={detail.group.photoURL} alt="" />}
            <AvatarFallback>{detail.group.name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{detail.group.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-3.5" />
              {membersCount} member{membersCount === 1 ? "" : "s"}
            </p>
            {detail.group.description && (
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {detail.group.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {isAdmin && <GroupSettingsDialog group={detail.group} />}
          {isMember ? (
            <Button variant="outline" size="sm" onClick={handleLeave} disabled={busy}>
              <LogOut className="mr-1.5 size-4" />
              Leave
            </Button>
          ) : (
            <Button size="sm" onClick={handleJoin} disabled={busy}>
              Join group
            </Button>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold">Members</h2>
        <div className="divide-y rounded-lg border">
          {members.map(member => (
            <div key={member.uid} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar className="size-9">
                <AvatarImage
                  src={
                    member.photoURL ||
                    userAltImageUrl({ name: member.fullName || member.username })
                  }
                  alt=""
                />
                <AvatarFallback>
                  {(member.fullName || member.username || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.fullName || member.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
              </div>
              {member.role === "admin" && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Crown className="size-3" />
                  Admin
                </span>
              )}
              {isAdmin && member.uid !== currentUid && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Member options">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {member.role === "admin" ? (
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => handleRoleChange(member.uid, "member")}
                      >
                        <ShieldMinus className="size-4" />
                        Remove as admin
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => handleRoleChange(member.uid, "admin")}
                      >
                        <ShieldPlus className="size-4" />
                        Make admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      className="gap-2"
                      onClick={() => handleRemove(member.uid)}
                    >
                      <UserMinus className="size-4" />
                      Remove from group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </div>

      {isMember && <GroupPolls groupId={detail.group.id} initialPolls={initialPolls} />}
    </div>
  );
}
