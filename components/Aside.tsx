"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Crown,
  FileIcon,
  FileText,
  Film,
  ImageIcon,
  MessageCircle,
  MoreVertical,
  Pin,
  ShieldMinus,
  ShieldPlus,
  UserMinus,
  Users,
} from "lucide-react";

import WhoToFollow from "./Features/follow/WhoToFollow";
import RecommendationRail from "@/components/feed/RecommendationRail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDirectConversationId } from "@/lib/conversation-utils.mjs";
import { useOnlineFriends } from "@/hooks/useOnlineFriends";
import { useConversations } from "@/hooks/useConversations";
import { useUserStore } from "@/lib/store/useUserStore";
import { useGroupStore } from "@/lib/store/useGroupStore";
import { useVideoQueueStore } from "@/lib/store/useVideoQueueStore";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import ConversationRow from "@/app/(dashboard)/messages/Conversation";

// @stream-io/video-react-sdk (imported transitively via useStartCall) is a
// WebRTC client library — Aside is mounted on nearly every authenticated
// page and server-rendered on first load like any other route, so a static
// import here would pull that module into the server render pass (the
// exact class of bug that took the whole app down earlier — see
// StreamVideoProvider). ssr:false keeps it out of that path entirely.
const DirectCallButton = dynamic(() => import("@/components/calls/DirectCallButton"), {
  ssr: false,
});
import NewConversationDialog from "@/components/inbox/NewConversationDialog";
import { removeMember, setMemberRole, type GroupFileProps } from "@/app/actions/groups";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function MessagesAside() {
  const { conversations, loaded, user } = useConversations();

  return (
    <div className="flex w-full flex-col p-4">
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="text-base font-semibold">Messages</h2>
        <NewConversationDialog />
      </div>

      <div className="flex flex-col gap-1">
        {!loaded &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        {loaded && conversations.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No conversations yet
          </p>
        )}
        {user &&
          conversations.map(conv => {
            const other =
              conv.participants.find(p => p !== user.uid) || "Unknown";
            return <ConversationRow key={conv.id} otherUid={other} conv={conv} />;
          })}
      </div>
    </div>
  );
}

const MEMBERS_PREVIEW = 8;

function VideoQueueAside() {
  const { queue, activeIndex, setActiveIndex } = useVideoQueueStore();

  if (queue.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <p className="text-sm font-semibold">Up next</p>
        <span className="text-xs text-muted-foreground">{queue.length} videos</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {queue.map((post, index) => {
          const thumb = post.media?.find(m => m.type === "video")?.src ?? null;
          const isActive = index === activeIndex;
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                // Scroll the video feed section into view via a custom event
                window.dispatchEvent(new CustomEvent("video-queue-jump", { detail: { index } }));
              }}
              className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-muted/50 ${isActive ? "bg-muted" : ""}`}
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {thumb && (
                  <video
                    src={thumb}
                    className="h-full w-full object-cover"
                    muted
                    preload="metadata"
                  />
                )}
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="size-3 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate text-xs font-medium">@{post.username}</p>
                <p className="line-clamp-2 mt-0.5 text-xs leading-snug text-muted-foreground">
                  {post.content || "Video"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const FILES_PREVIEW = 4;

function fileTypeIcon(type: GroupFileProps["fileType"]) {
  if (type === "image") return <ImageIcon className="size-3.5 text-blue-500" />;
  if (type === "video") return <Film className="size-3.5 text-purple-500" />;
  if (type === "pdf") return <FileText className="size-3.5 text-red-500" />;
  return <FileIcon className="size-3.5 text-muted-foreground" />;
}

function GroupFilesAside() {
  const { files } = useGroupStore();
  const [showAll, setShowAll] = useState(false);

  if (files.length === 0) return null;

  const pinned = files.filter(f => f.isPinned);
  const rest = files.filter(f => !f.isPinned);
  // Pinned files always show; "show more" reveals the rest.
  const displayed = showAll ? files : pinned.length > 0 ? pinned : files.slice(0, FILES_PREVIEW);
  const hiddenCount = files.length - displayed.length;

  return (
    <div className="space-y-2 border-b pb-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <FileIcon className="size-3.5" />
        Files
        <span className="text-xs font-normal text-muted-foreground">({files.length})</span>
      </h2>
      <div className="space-y-0.5">
        {displayed.map(file => (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
          >
            {fileTypeIcon(file.fileType)}
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            {file.isPinned && <Pin className="size-3 shrink-0 fill-current text-muted-foreground" />}
          </a>
        ))}
      </div>
      {(hiddenCount > 0 || (showAll && (pinned.length > 0 && rest.length > 0))) && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(v => !v)}
        >
          <ChevronDown className={`mr-1.5 size-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll ? "Show less" : `Show ${rest.length > 0 ? rest.length : files.length} more`}
        </Button>
      )}
    </div>
  );
}

function GroupMembersAside() {
  const currentUid = useUserStore(state => state.user?.uid);
  const { group, members, myRole, updateMembers } = useGroupStore();
  const [showAll, setShowAll] = useState(false);

  const isAdmin = myRole === "admin";
  const displayed = showAll ? members : members.slice(0, MEMBERS_PREVIEW);
  const onlineCount = members.filter(m => m.isOnline).length;

  const handleRemove = async (targetUid: string) => {
    if (!group) return;
    if (!confirm("Remove this member?")) return;
    try {
      await removeMember(group.id, targetUid);
      updateMembers(members.filter(m => m.uid !== targetUid));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleRoleChange = async (targetUid: string, role: "admin" | "member") => {
    if (!group) return;
    try {
      await setMemberRole(group.id, targetUid, role);
      updateMembers(members.map(m => m.uid === targetUid ? { ...m, role } : m));
      toast.success(role === "admin" ? "Promoted to admin" : "Removed as admin");
    } catch {
      toast.error("Failed to update role");
    }
  };

  if (!group) return null;

  return (
    <div className="flex w-full flex-col p-4 space-y-3">
      <GroupFilesAside />
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Users className="size-4" />
          Members
          <span className="text-sm font-normal text-muted-foreground">({group.membersCount})</span>
        </h2>
        {onlineCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <span className="size-1.5 rounded-full bg-green-500 inline-block" />
            {onlineCount} online
          </span>
        )}
      </div>

      <div className="space-y-1">
        {displayed.map(member => (
          <div key={member.uid} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
            <div className="relative shrink-0">
              <Avatar className="size-8">
                <AvatarImage
                  src={member.photoURL || userAltImageUrl({ name: member.fullName || member.username })}
                  alt=""
                />
                <AvatarFallback className="text-xs">
                  {(member.fullName || member.username || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {member.isOnline && (
                <span className="absolute bottom-0 right-0 size-2 rounded-full bg-green-500 ring-1.5 ring-background" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">
                {member.fullName || member.username}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {member.role === "admin" && (
                  <><Crown className="size-2.5 text-primary" /> Admin · </>
                )}
                @{member.username}
              </p>
            </div>
            {isAdmin && member.uid !== currentUid && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6 shrink-0 opacity-60 hover:opacity-100">
                    <MoreVertical className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  {member.role === "admin" ? (
                    <DropdownMenuItem className="gap-2" onClick={() => void handleRoleChange(member.uid, "member")}>
                      <ShieldMinus className="size-3.5" /> Remove as admin
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="gap-2" onClick={() => void handleRoleChange(member.uid, "admin")}>
                      <ShieldPlus className="size-3.5" /> Make admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" className="gap-2" onClick={() => void handleRemove(member.uid)}>
                    <UserMinus className="size-3.5" /> Remove from group
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
          onClick={() => setShowAll(v => !v)}
        >
          <ChevronDown className={`mr-1.5 size-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll ? "Show less" : `Show ${members.length - MEMBERS_PREVIEW} more`}
        </Button>
      )}
    </div>
  );
}

export default function Aside() {
  const pathname = usePathname();
  const currentUser = useUserStore(state => state.user);
  const { friendPreviews: allFriendPreviews, friendsLabel } = useOnlineFriends(6);
  // Desktop sidebar only has room for a couple — the mobile equivalent
  // (OnlineFriendsStrip, shown on the home feed) uses the full list from
  // the same hook instead of re-fetching.
  const friendPreviews = allFriendPreviews.slice(0, 2);

  if (pathname?.startsWith("/messages")) {
    return <MessagesAside />;
  }

  if (pathname?.match(/^\/discover\/groups\/[^/]+/)) {
    return <GroupMembersAside />;
  }

  if (pathname?.startsWith("/watch")) {
    return <VideoQueueAside />;
  }

  return (
    <div className="flex w-full flex-col space-y-6 p-4">
      <Card className="py-4">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Friends online</CardTitle>
          <p className="text-sm text-muted-foreground">{friendsLabel}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {friendPreviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your friends will appear here when they are active.
            </p>
          ) : (
            friendPreviews.map(friend => {
              const conversationId = currentUser
                ? buildDirectConversationId(currentUser.uid, friend.uid)
                : friend.uid;

              return (
                <div
                  key={friend.uid}
                  className="flex items-center gap-3 rounded-2xl border bg-background/60 p-3"
                >
                  <Avatar className="size-11">
                    <AvatarImage
                      src={
                        friend.photoURL ||
                        userAltImageUrl({
                          name: friend.fullName || friend.username,
                        })
                      }
                      alt={`${friend.fullName || friend.username}'s avatar`}
                    />
                    <AvatarFallback>
                      {(friend.fullName || friend.username || "U")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {friend.fullName || friend.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{friend.username} ·{" "}
                      {friend.status === "online"
                        ? "online"
                        : friend.status === "recently-active"
                          ? "recently active"
                          : "offline"}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button asChild size="sm" variant="secondary" className="h-8">
                        <Link href={`/messages/${conversationId}`}>
                          <MessageCircle className="mr-1.5 size-4" />
                          Message
                        </Link>
                      </Button>
                      <DirectCallButton
                        targetUid={friend.uid}
                        label="Call"
                        variant="outline"
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <WhoToFollow compact />

      <RecommendationRail type="groups" />
    </div>
  );
}
