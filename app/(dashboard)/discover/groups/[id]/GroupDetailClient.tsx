"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Globe,
  Lock,
  LogOut,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGroupStore } from "@/lib/store/useGroupStore";
import { useGroupMembershipStore } from "@/lib/store/useGroupMembershipStore";
import { useUserStore } from "@/lib/store/useUserStore";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import {
  approveJoinRequest,
  joinGroup,
  leaveGroup,
  rejectJoinRequest,
  type GroupDetail,
  type GroupFileProps,
  type GroupMemberProps,
  type GroupPostProps,
  type JoinRequestProps,
} from "@/app/actions/groups";
import type { PollProps } from "@/app/actions/polls";
import { GroupSettingsDialog } from "./GroupSettingsDialog";
import { GroupPostComposer } from "./GroupPostComposer";
import { GroupPostsFeed } from "./GroupPostsFeed";
import { GroupFiles } from "./GroupFiles";
import { GroupAudioRoom } from "@/components/groups/GroupAudioRoom";

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
  const { setGroupContext, clearGroupContext } = useGroupStore();

  const [membersCount, setMembersCount] = useState(detail.group.membersCount);
  const [joinRequests, setJoinRequests] = useState<JoinRequestProps[]>(initialJoinRequests);
  const [posts, setPosts] = useState<GroupPostProps[]>(initialPosts);
  const [polls, setPolls] = useState<PollProps[]>(initialPolls);
  const [files] = useState<GroupFileProps[]>(initialFiles);
  const [busy, setBusy] = useState(false);
  const [requestPending, setRequestPending] = useState(detail.hasPendingRequest);
  // localMyRole is derived from the server data; it starts as the server-known
  // role (or null) and is updated optimistically after join/leave actions.
  // We also fall back to detail.myRole (passed directly from the server) which
  // is already resolved, so if the user store is slow to hydrate we still have it.
  const [localMyRole, setLocalMyRole] = useState<"admin" | "member" | null>(
    detail.myRole ?? detail.members.find(m => m.uid === currentUid)?.role ?? null
  );

  // If the user store was not hydrated at initial render, sync once it is.
  useEffect(() => {
    if (localMyRole !== null || !currentUid) return;
    const roleFromMembers = detail.members.find(m => m.uid === currentUid)?.role ?? detail.myRole ?? null;
    if (roleFromMembers !== null) setLocalMyRole(roleFromMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUid]);

  // Sorted: online first, then admins, then alphabetical
  const sortedMembers = [...detail.members].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return (a.fullName || a.username).localeCompare(b.fullName || b.username);
  });

  // Push group context to the aside store on mount, clear on unmount.
  // Pinning a file afterward updates the store directly from GroupFiles
  // (see its handlePin) rather than round-tripping through this state.
  useEffect(() => {
    setGroupContext(detail.group, sortedMembers, detail.myRole, files);
    // Seed the cross-page membership store from this fresh server fetch so
    // the /discover/groups list (if visited next) already knows this group's
    // status instead of showing "Join" again.
    useGroupMembershipStore.getState().setInitial(
      detail.myRole ? [detail.group.id] : [],
      detail.hasPendingRequest ? [detail.group.id] : []
    );
    return () => clearGroupContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myRole = localMyRole;
  const isMember = !!myRole;
  const isAdmin = myRole === "admin";

  const handleJoin = async () => {
    setBusy(true);
    try {
      const result = await joinGroup(detail.group.id);
      if (result.status === "requested") {
        setRequestPending(true);
        useGroupMembershipStore.getState().markRequested(detail.group.id);
        toast.success("Join request sent — waiting for admin approval");
      } else {
        // Optimistic update — no page refresh needed
        setLocalMyRole("member");
        setMembersCount(prev => prev + 1);
        useGroupMembershipStore.getState().markJoined(detail.group.id);
        const newMember = {
          uid: currentUid ?? "",
          role: "member" as const,
          joinedAt: new Date().toISOString(),
          username: currentUser?.username ?? "",
          fullName: currentUser?.fullName ?? "",
          photoURL: currentUser?.photoURL ?? null,
          isOnline: true,
        };
        const updatedMembers = [newMember, ...useGroupStore.getState().members];
        useGroupStore.getState().updateMembers(updatedMembers);
        toast.success("Joined group");
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
      // Optimistic update
      setLocalMyRole(null);
      setMembersCount(prev => Math.max(0, prev - 1));
      useGroupMembershipStore.getState().markLeft(detail.group.id);
      const updatedMembers = useGroupStore.getState().members.filter(m => m.uid !== currentUid);
      useGroupStore.getState().updateMembers(updatedMembers);
      toast.success("Left group");
      router.push("/discover/groups");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave group");
      setBusy(false);
    }
  };

  const handleApproveRequest = async (req: JoinRequestProps) => {
    try {
      await approveJoinRequest(detail.group.id, req.uid);
      setJoinRequests(prev => prev.filter(r => r.uid !== req.uid));
      setMembersCount(prev => prev + 1);
      // Update Zustand store so the aside members list reflects immediately
      const newMember: GroupMemberProps = {
        uid: req.uid,
        role: "member",
        joinedAt: new Date().toISOString(),
        username: req.username ?? "",
        fullName: req.fullName ?? "",
        photoURL: req.photoURL ?? null,
        isOnline: false,
      };
      const currentMembers = useGroupStore.getState().members;
      const alreadyInList = currentMembers.some(m => m.uid === req.uid);
      if (!alreadyInList) {
        useGroupStore.getState().updateMembers([...currentMembers, newMember]);
      } else {
        // Was pending/unapproved — already showing but was pending; refresh list
        useGroupStore.getState().updateMembers(
          currentMembers.map(m => m.uid === req.uid ? { ...m, role: "member" } : m)
        );
      }
      toast.success(`${req.username ?? "User"} approved`);
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

  // Unified timeline: posts and polls interleaved by creation date (newest first)
  type TimelineItem =
    | { type: "post"; data: GroupPostProps }
    | { type: "poll"; data: PollProps };

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...posts.map(p => ({ type: "post" as const, data: p })),
      ...polls.map(p => ({ type: "poll" as const, data: p })),
    ];
    items.sort((a, b) => {
      const da = new Date(a.data.createdAt).getTime();
      const db = new Date(b.data.createdAt).getTime();
      return db - da;
    });
    return items;
  }, [posts, polls]);

  return (
    <div className="space-y-0">
      {/* Cover / wall image — full bleed */}
      {detail.group.wallURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={detail.group.wallURL}
          alt=""
          className="h-44 w-full object-cover sm:h-56 rounded-xl"
        />
      ) : (
        <div className="h-24 w-full rounded-xl bg-linear-to-br from-primary/20 to-primary/5" />
      )}

      {/* Identity bar: avatar + name + actions. The avatar-over-cover overlap
          only works once avatar and text sit side by side (sm: and up) —
          on mobile they stack vertically via flex-col, so pulling the whole
          block up with the same negative margin dragged the text (member
          count, join date) up underneath the cover image too. */}
      <div className="flex flex-col gap-3 px-1 pt-3 sm:flex-row sm:items-end sm:justify-between sm:pt-0 sm:-mt-12">
        <div className="flex items-end gap-4">
          <Avatar className="size-20 sm:size-24 shrink-0 border-4 border-background ring-2 ring-background shadow-md">
            {detail.group.photoURL && (
              <AvatarImage src={detail.group.photoURL} alt="" />
            )}
            <AvatarFallback className="text-3xl font-bold bg-primary/10">
              {detail.group.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold leading-tight sm:text-xl">
                {detail.group.name}
              </h1>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                {detail.group.joinPolicy === "open" ? (
                  <Globe className="size-3" />
                ) : (
                  <Lock className="size-3" />
                )}
                {detail.group.joinPolicy === "open" ? "Open" : "Admin approval"}
              </Badge>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {membersCount} member{membersCount === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {format(new Date(detail.group.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 pb-1">
          {isAdmin && <GroupSettingsDialog group={detail.group} />}
          {isMember ? (
            <Button variant="destructive" size="sm" onClick={handleLeave} disabled={busy}>
              <LogOut className="mr-1.5 size-4" />
              Leave
            </Button>
          ) : requestPending ? (
            <Button size="sm" variant="outline" disabled>
              Request pending…
            </Button>
          ) : (
            <Button size="sm" onClick={handleJoin} disabled={busy}>
              Join group
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {detail.group.description && (
        <p className="px-1 pt-3 text-sm text-muted-foreground leading-relaxed">
          {detail.group.description}
        </p>
      )}

      {/* Audio room — members only, same as posting */}
      {isMember && (
        <div className="pt-3">
          <GroupAudioRoom groupId={detail.group.id} />
        </div>
      )}

      {/* Divider */}
      <div className="my-4 border-t" />

      {/* Admin: join requests */}
      {isAdmin && joinRequests.length > 0 && (
        <div className="mb-4 rounded-xl border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">
            Join requests ({joinRequests.length})
          </h2>
          <div className="space-y-2">
            {joinRequests.map(req => (
              <div key={req.uid} className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0">
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
                  className="size-8 text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => void handleApproveRequest(req)}
                  title="Approve"
                >
                  <Check className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => void handleRejectRequest(req)}
                  title="Reject"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Posts / Files */}
      <Tabs defaultValue="posts">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          {isMember && <TabsTrigger value="files">Files</TabsTrigger>}
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-4">
          {isMember && (
            <GroupPostComposer
              groupId={detail.group.id}
              myPhotoURL={currentUser?.photoURL}
              myName={currentUser?.fullName || currentUser?.username}
              defaultVisibility={detail.group.defaultPostVisibility ?? "public"}
              onPosted={post => setPosts(prev => [post, ...prev])}
              onPollCreated={poll => setPolls(prev => [poll, ...prev])}
            />
          )}
          <GroupPostsFeed
            timeline={timeline}
            isAdmin={isAdmin}
            isMember={isMember}
            currentUid={currentUid}
            onPollVoted={(updatedPoll) =>
              setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p))
            }
          />
        </TabsContent>

        {isMember && (
          <TabsContent value="files" className="mt-4">
            <GroupFiles
              groupId={detail.group.id}
              posts={posts}
              pinnedFiles={files}
              isAdmin={isAdmin}
              currentUid={currentUid}
              isMember={isMember}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
