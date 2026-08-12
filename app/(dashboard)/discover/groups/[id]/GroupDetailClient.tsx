"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Crown,
  Globe,
  Lock,
  LogOut,
  MoreVertical,
  ShieldMinus,
  ShieldPlus,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserStore } from "@/lib/store/useUserStore";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import {
  approveJoinRequest,
  joinGroup,
  leaveGroup,
  rejectJoinRequest,
  removeMember,
  setMemberRole,
  type GroupDetail,
  type GroupFileProps,
  type GroupMemberProps,
  type GroupPostProps,
  type JoinRequestProps,
} from "@/app/actions/groups";
import type { PollProps } from "@/app/actions/polls";
import { GroupSettingsDialog } from "./GroupSettingsDialog";
import { GroupPolls } from "./GroupPolls";
import { GroupPostComposer } from "./GroupPostComposer";
import { GroupPostsFeed } from "./GroupPostsFeed";
import { GroupFiles } from "./GroupFiles";

const MEMBERS_PREVIEW = 5;

export function GroupDetailClient({
  detail,
  initialPolls,
  initialPosts,
  initialFiles,
  initialJoinRequests,
}: {
  detail: GroupDetail;
  initialPolls: PollProps[];
  initialPosts: GroupPostProps[];
  initialFiles: GroupFileProps[];
  initialJoinRequests: JoinRequestProps[];
}) {
  const router = useRouter();
  const currentUid = useUserStore(state => state.user?.uid);
  const currentUser = useUserStore(state => state.user);
  const [members, setMembers] = useState<GroupMemberProps[]>(detail.members);
  const [membersCount, setMembersCount] = useState(detail.group.membersCount);
  const [joinRequests, setJoinRequests] = useState<JoinRequestProps[]>(initialJoinRequests);
  const [posts, setPosts] = useState<GroupPostProps[]>(initialPosts);
  const [busy, setBusy] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [requestPending, setRequestPending] = useState(false);

  const myRole = members.find(m => m.uid === currentUid)?.role ?? null;
  const isMember = !!myRole;
  const isAdmin = myRole === "admin";

  const displayedMembers = showAllMembers ? members : members.slice(0, MEMBERS_PREVIEW);

  const handleJoin = async () => {
    setBusy(true);
    try {
      const result = await joinGroup(detail.group.id);
      if (result.status === "requested") {
        setRequestPending(true);
        toast.success("Join request sent — waiting for admin approval");
      } else {
        toast.success("Joined group");
        router.refresh();
      }
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

  const handleApproveRequest = async (req: JoinRequestProps) => {
    try {
      await approveJoinRequest(detail.group.id, req.uid);
      setJoinRequests(prev => prev.filter(r => r.uid !== req.uid));
      setMembersCount(prev => prev + 1);
      toast.success(`${req.username ?? "User"} approved`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleRejectRequest = async (req: JoinRequestProps) => {
    try {
      await rejectJoinRequest(detail.group.id, req.uid);
      setJoinRequests(prev => prev.filter(r => r.uid !== req.uid));
      toast.success("Request rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Main column */}
      <div className="min-w-0 flex-1 space-y-6">
        {/* Group header with wall image */}
        <div className="overflow-hidden rounded-xl border bg-card">
          {detail.group.wallURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.group.wallURL}
              alt=""
              className="h-36 w-full object-cover sm:h-48"
            />
          )}
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar
                className={`size-20 shrink-0 border-4 border-background ${detail.group.wallURL ? "-mt-10" : ""}`}
              >
                {detail.group.photoURL && (
                  <AvatarImage src={detail.group.photoURL} alt="" />
                )}
                <AvatarFallback className="text-2xl font-bold">
                  {detail.group.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold">{detail.group.name}</h1>
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    {detail.group.joinPolicy === "open" ? (
                      <Globe className="size-3" />
                    ) : (
                      <Lock className="size-3" />
                    )}
                    {detail.group.joinPolicy === "open" ? "Open" : "Admin approval"}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    {membersCount} member{membersCount === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    Created {format(new Date(detail.group.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                {detail.group.description && (
                  <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
                    {detail.group.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              {isAdmin && <GroupSettingsDialog group={detail.group} />}
              {isMember ? (
                <Button variant="destructive" size="sm" onClick={handleLeave} disabled={busy}>
                  <LogOut className="mr-1.5 size-4" />
                  Leave
                </Button>
              ) : requestPending ? (
                <Button size="sm" variant="outline" disabled>
                  Request pending
                </Button>
              ) : (
                <Button size="sm" onClick={handleJoin} disabled={busy}>
                  Join group
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Admin: join requests */}
        {isAdmin && joinRequests.length > 0 && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">
              Join requests ({joinRequests.length})
            </h2>
            <div className="space-y-2">
              {joinRequests.map(req => (
                <div key={req.uid} className="flex items-center gap-3">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage
                      src={
                        req.photoURL ||
                        userAltImageUrl({ name: req.fullName || req.username || "" })
                      }
                      alt=""
                    />
                    <AvatarFallback>
                      {(req.fullName || req.username || "U").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {req.fullName || req.username}
                    </p>
                    <p className="text-xs text-muted-foreground">@{req.username}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7 text-green-600 border-green-600"
                    onClick={() => void handleApproveRequest(req)}
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7 text-destructive border-destructive"
                    onClick={() => void handleRejectRequest(req)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs: Posts / Polls / Files */}
        <Tabs defaultValue="posts">
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            {isMember && <TabsTrigger value="polls">Polls</TabsTrigger>}
            {isMember && <TabsTrigger value="files">Files</TabsTrigger>}
          </TabsList>

          <TabsContent value="posts" className="mt-4 space-y-4">
            {isMember && (
              <GroupPostComposer
                groupId={detail.group.id}
                myPhotoURL={currentUser?.photoURL}
                myName={currentUser?.fullName || currentUser?.username}
                onPosted={post => setPosts(prev => [post, ...prev])}
              />
            )}
            <GroupPostsFeed
              groupId={detail.group.id}
              initialPosts={posts}
              isAdmin={isAdmin}
              currentUid={currentUid}
            />
          </TabsContent>

          {isMember && (
            <TabsContent value="polls" className="mt-4">
              <GroupPolls groupId={detail.group.id} initialPolls={initialPolls} />
            </TabsContent>
          )}

          {isMember && (
            <TabsContent value="files" className="mt-4">
              <GroupFiles
                groupId={detail.group.id}
                initialFiles={initialFiles}
                isAdmin={isAdmin}
                currentUid={currentUid}
                isMember={isMember}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Members sidebar */}
      <aside className="lg:w-72 xl:w-80 shrink-0">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Users className="size-4" />
            Members ({membersCount})
          </h2>
          <div className="space-y-2">
            {displayedMembers.map(member => (
              <div key={member.uid} className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <Avatar className="size-8">
                    <AvatarImage
                      src={
                        member.photoURL ||
                        userAltImageUrl({ name: member.fullName || member.username })
                      }
                      alt=""
                    />
                    <AvatarFallback className="text-xs">
                      {(member.fullName || member.username || "U").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {member.fullName || member.username}
                  </p>
                  {member.role === "admin" && (
                    <span className="flex items-center gap-0.5 text-[10px] text-primary">
                      <Crown className="size-2.5" />
                      Admin
                    </span>
                  )}
                </div>
                {isAdmin && member.uid !== currentUid && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-6 shrink-0">
                        <MoreVertical className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role === "admin" ? (
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={() => handleRoleChange(member.uid, "member")}
                        >
                          <ShieldMinus className="size-3.5" />
                          Remove as admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={() => handleRoleChange(member.uid, "admin")}
                        >
                          <ShieldPlus className="size-3.5" />
                          Make admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        className="gap-2 text-xs"
                        onClick={() => handleRemove(member.uid)}
                      >
                        <UserMinus className="size-3.5" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>

          {members.length > MEMBERS_PREVIEW && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowAllMembers(v => !v)}
            >
              <ChevronDown
                className={`mr-1.5 size-3.5 transition-transform ${showAllMembers ? "rotate-180" : ""}`}
              />
              {showAllMembers
                ? "Show less"
                : `Show ${members.length - MEMBERS_PREVIEW} more`}
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}
