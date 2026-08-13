"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GroupProps = {
  id: string;
  name: string;
  description: string;
  photoURL: string | null;
  wallURL: string | null;
  ownerUid: string;
  membersCount: number;
  createdAt: string;
  joinPolicy: "open" | "admin";
  defaultPostVisibility: "public" | "private";
  isMember?: boolean;
};

export type GroupRole = "admin" | "member";

export type GroupMemberProps = {
  uid: string;
  role: GroupRole;
  joinedAt: string;
  username: string;
  fullName: string;
  photoURL: string | null;
  isOnline: boolean;
};

export type GroupDetail = {
  group: GroupProps;
  members: GroupMemberProps[];
  myRole: GroupRole | null;
};

async function withSupabaseRequestContext<T>(
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  await supabase.auth.getUser();
  // runWithSupabaseClient's callback runs inside AsyncLocalStorage.run and
  // doesn't forward arguments, so pass the client explicitly rather than
  // relying on that plumbing.
  return runWithSupabaseClient(supabase, () => callback(supabase));
}

function mapGroupRow(row: Record<string, unknown>): GroupProps {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    photoURL: (row.photourl as string) ?? null,
    wallURL: (row.wallurl as string) ?? null,
    ownerUid: row.owneruid as string,
    membersCount: (row.memberscount as number) ?? 0,
    createdAt: row.createdat as string,
    joinPolicy: (row.joinpolicy as "open" | "admin") ?? "open",
    defaultPostVisibility: (row.defaultpostvisibility as "public" | "private") ?? "public",
  };
}

export async function listGroups(limit = 20): Promise<GroupProps[]> {
  return withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("groups")
      .select("*")
      .order("memberscount", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapGroupRow);
  });
}

export async function getUserGroups(uid: string): Promise<GroupProps[]> {
  return withSupabaseRequestContext(async client => {
    const { data: memberships, error: memberError } = await client
      .from("group_members")
      .select("groupid")
      .eq("uid", uid);
    if (memberError) throw memberError;

    const groupIds = (memberships ?? []).map(row => row.groupid as string);
    if (groupIds.length === 0) return [];

    const { data, error } = await client.from("groups").select("*").in("id", groupIds);
    if (error) throw error;
    return (data ?? []).map(mapGroupRow);
  });
}

export async function createGroup(input: { name: string; description?: string }): Promise<GroupProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");
  if (!input.name.trim()) throw new Error("Group name is required");

  return withSupabaseRequestContext(async client => {
    const id = crypto.randomUUID();
    const { error: groupError } = await client.from("groups").insert({
      id,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      owneruid: uid,
      memberscount: 1,
    });
    if (groupError) throw groupError;

    const { error: memberError } = await client
      .from("group_members")
      .insert({ id: crypto.randomUUID(), groupid: id, uid, role: "admin" });
    if (memberError) throw memberError;

    return {
      id,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      photoURL: null,
      wallURL: null,
      ownerUid: uid,
      membersCount: 1,
      createdAt: new Date().toISOString(),
      joinPolicy: "open",
      defaultPostVisibility: "public",
    };
  });
}

export async function joinGroup(groupId: string): Promise<{ status: "joined" | "requested" }> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  return withSupabaseRequestContext(async client => {
    const { data: groupRow, error: groupError } = await client
      .from("groups")
      .select("joinpolicy")
      .eq("id", groupId)
      .maybeSingle();
    if (groupError) throw groupError;
    if (!groupRow) throw new Error("Group not found");

    if ((groupRow as { joinpolicy: string }).joinpolicy === "admin") {
      // Create a join request instead of directly adding
      const { error } = await client
        .from("group_join_requests")
        .insert({ id: crypto.randomUUID(), groupid: groupId, uid });
      if (error && error.code !== "23505") throw error; // ignore duplicate
      return { status: "requested" };
    }

    const { error } = await client
      .from("group_members")
      .insert({ id: crypto.randomUUID(), groupid: groupId, uid });
    if (error) throw error;

    const { count, error: countError } = await client
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("groupid", groupId);
    if (countError) throw countError;

    await client
      .from("groups")
      .update({ memberscount: count ?? 1 })
      .eq("id", groupId);

    return { status: "joined" };
  });
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { error } = await client
      .from("group_members")
      .delete()
      .eq("groupid", groupId)
      .eq("uid", uid);
    if (error) throw error;

    const { count, error: countError } = await client
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("groupid", groupId);
    if (countError) throw countError;

    await client
      .from("groups")
      .update({ memberscount: count ?? 0 })
      .eq("id", groupId);
  });
}

function mapMemberRow(row: Record<string, unknown>): GroupMemberProps {
  const profile = (row.users ?? {}) as Record<string, unknown>;
  const lastSeenRaw = profile.lastseen as string | null | undefined;
  const isOnline = lastSeenRaw
    ? Date.now() - new Date(lastSeenRaw).getTime() < 5 * 60 * 1000
    : false;
  return {
    uid: row.uid as string,
    role: (row.role as GroupRole) ?? "member",
    joinedAt: row.joinedat as string,
    username: (profile.username as string) ?? "",
    fullName: (profile.fullname as string) ?? "",
    photoURL: (profile.photourl as string) ?? null,
    isOnline,
  };
}

export async function getGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const { uid } = await getUserFromSession();

  return withSupabaseRequestContext(async client => {
    const { data: groupRow, error: groupError } = await client
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .maybeSingle();
    if (groupError) throw groupError;
    if (!groupRow) return null;

    const { data: memberRows, error: memberError } = await client
      .from("group_members")
      .select("uid, role, joinedat, users:uid(username, fullname, photourl, lastseen)")
      .eq("groupid", groupId)
      .order("joinedat", { ascending: true });
    if (memberError) throw memberError;

    const members = (memberRows ?? []).map(mapMemberRow);
    const myRole = uid ? members.find(m => m.uid === uid)?.role ?? null : null;

    return { group: mapGroupRow(groupRow), members, myRole };
  });
}

export async function updateGroupSettings(
  groupId: string,
  input: { name?: string; description?: string; photoURL?: string | null; wallURL?: string | null; joinPolicy?: "open" | "admin"; defaultPostVisibility?: "public" | "private" }
): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error("Group name is required");
    patch.name = input.name.trim();
  }
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.photoURL !== undefined) patch.photourl = input.photoURL;
  if (input.wallURL !== undefined) patch.wallurl = input.wallURL;
  if (input.joinPolicy !== undefined) patch.joinpolicy = input.joinPolicy;
  if (input.defaultPostVisibility !== undefined) patch.defaultpostvisibility = input.defaultPostVisibility;
  if (Object.keys(patch).length === 0) return;

  await withSupabaseRequestContext(async client => {
    // RLS (groups_update_admin) restricts this to admins of the group; an
    // unauthorized caller's update simply matches zero rows rather than
    // erroring, so check the result to surface that as a real failure.
    const { data, error } = await client
      .from("groups")
      .update(patch)
      .eq("id", groupId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Only group admins can edit settings");
  });
}

export async function setMemberRole(
  groupId: string,
  targetUid: string,
  role: GroupRole
): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");
  if (uid === targetUid) throw new Error("You can't change your own role");

  await withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("group_members")
      .update({ role })
      .eq("groupid", groupId)
      .eq("uid", targetUid)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Only group admins can change roles");
  });
}

export async function removeMember(groupId: string, targetUid: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");
  if (uid === targetUid) throw new Error("Use leave group instead of removing yourself");

  await withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("group_members")
      .delete()
      .eq("groupid", groupId)
      .eq("uid", targetUid)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Only group admins can remove members");

    const { count, error: countError } = await client
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("groupid", groupId);
    if (countError) throw countError;

    await client
      .from("groups")
      .update({ memberscount: count ?? 0 })
      .eq("id", groupId);
  });
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    // RLS (groups_delete_admin) restricts this to admins of the group.
    const { data, error } = await client
      .from("groups")
      .delete()
      .eq("id", groupId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Only group admins can delete the group");
  });
}

// ─── Group Posts ──────────────────────────────────────────────────────────────

export type GroupPostVisibility = "public" | "private";

export type GroupPostProps = {
  id: string;
  groupId: string;
  userId: string;
  text: string;
  media: Array<{ url: string; type: string }>;
  visibility: GroupPostVisibility;
  isPinned: boolean;
  createdAt: string;
  authorUsername?: string;
  authorFullName?: string;
  authorPhotoURL?: string | null;
};

function mapGroupPostRow(row: Record<string, unknown>): GroupPostProps {
  const author = (row.users ?? {}) as Record<string, unknown>;
  const media = Array.isArray(row.media) ? (row.media as Array<{ url: string; type: string }>) : [];
  return {
    id: row.id as string,
    groupId: (row.groupid ?? row.groupId) as string,
    userId: (row.userid ?? row.userId) as string,
    text: ((row.content ?? row.text) as string) ?? "",
    media,
    visibility: (row.visibility as GroupPostVisibility) ?? "public",
    isPinned: Boolean(row.ispinned),
    createdAt: (row.createdAt ?? row.createdat) as string,
    authorUsername: (author.username as string) ?? undefined,
    authorFullName: (author.fullname as string) ?? undefined,
    authorPhotoURL: (author.photourl as string) ?? null,
  };
}

export async function createGroupPost(input: {
  groupId: string;
  text: string;
  media?: Array<{ url: string; type: string }>;
  visibility?: GroupPostVisibility;
}): Promise<GroupPostProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");
  if (!input.text.trim() && (!input.media || input.media.length === 0))
    throw new Error("Post must have text or media");

  return withSupabaseRequestContext(async client => {
    // Fetch the user's username — required non-null column on posts
    const { data: userRow } = await client
      .from("users")
      .select("username")
      .eq("uid", uid)
      .maybeSingle();
    const username = (userRow as { username: string } | null)?.username ?? "";

    const id = crypto.randomUUID();
    const { error } = await client.from("posts").insert({
      id,
      userid: uid,
      username,
      content: input.text.trim(),
      groupid: input.groupId,
      media: input.media ?? [],
      visibility: input.visibility ?? "public",
      ispinned: false,
      createdat: new Date().toISOString(),
    });
    if (error) throw error;

    return {
      id,
      groupId: input.groupId,
      userId: uid,
      text: input.text.trim(),
      media: input.media ?? [],
      visibility: input.visibility ?? "public",
      isPinned: false,
      createdAt: new Date().toISOString(),
    };
  });
}

export async function listGroupPosts(
  groupId: string,
  limit = 20,
  cursor?: string
): Promise<GroupPostProps[]> {
  const { uid } = await getUserFromSession();

  return withSupabaseRequestContext(async client => {
    let query = client
      .from("posts")
      .select("*, users:userid(username, fullname, photourl)")
      .eq("groupid", groupId)
      .order("ispinned", { ascending: false })
      .order("createdat", { ascending: false })
      .limit(limit);

    // Non-members only see public posts, and only if the group's own
    // admin-controlled default also allows public visibility — an
    // individual member marking their post "public" doesn't override the
    // group's setting. RLS (posts_read_all) enforces this as the source
    // of truth; this mirrors it so non-members don't pay for rows that
    // would just get filtered out anyway.
    let isMember = false;
    if (uid) {
      const { data: membership } = await client
        .from("group_members")
        .select("role")
        .eq("groupid", groupId)
        .eq("uid", uid)
        .maybeSingle();
      isMember = !!membership;
    }

    if (!isMember) {
      const { data: groupRow } = await client
        .from("groups")
        .select("defaultpostvisibility")
        .eq("id", groupId)
        .maybeSingle();
      const groupAllowsPublic =
        (groupRow as { defaultpostvisibility: string } | null)?.defaultpostvisibility === "public";

      query = groupAllowsPublic
        ? query.eq("visibility", "public")
        : query.eq("id", "__none__"); // group defaults to private — no post is visible to non-members
    }

    if (cursor) query = query.lt("createdat", cursor);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(row => mapGroupPostRow(row as Record<string, unknown>));
  });
}

export async function updateGroupPostVisibility(
  postId: string,
  visibility: GroupPostVisibility
): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    // Only author or group admin can change visibility
    const { data: post } = await client
      .from("posts")
      .select("userid, groupid")
      .eq("id", postId)
      .maybeSingle();
    if (!post) throw new Error("Post not found");

    const p = post as { userid: string; groupid: string };
    if (p.userid !== uid) {
      const { data: membership } = await client
        .from("group_members")
        .select("role")
        .eq("groupid", p.groupid)
        .eq("uid", uid)
        .maybeSingle();
      const m = membership as { role: string } | null;
      if (!m || m.role !== "admin") throw new Error("Not authorized");
    }

    const { error } = await client.from("posts").update({ visibility }).eq("id", postId);
    if (error) throw error;
  });
}

export async function pinGroupPost(postId: string, pin: boolean): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { data: post } = await client
      .from("posts")
      .select("groupid")
      .eq("id", postId)
      .maybeSingle();
    if (!post) throw new Error("Post not found");

    const { data: membership } = await client
      .from("group_members")
      .select("role")
      .eq("groupid", (post as { groupid: string }).groupid)
      .eq("uid", uid)
      .maybeSingle();
    const m = membership as { role: string } | null;
    if (!m || m.role !== "admin") throw new Error("Only admins can pin posts");

    const { error } = await client.from("posts").update({ ispinned: pin }).eq("id", postId);
    if (error) throw error;
  });
}

// ─── Group Files ──────────────────────────────────────────────────────────────

export type GroupFileType = "image" | "video" | "pdf" | "file";

export type GroupFileProps = {
  id: string;
  groupId: string;
  uploaderUid: string;
  name: string;
  url: string;
  fileType: GroupFileType;
  size: number;
  isPinned: boolean;
  createdAt: string;
  uploaderUsername?: string;
};

function mapGroupFileRow(row: Record<string, unknown>): GroupFileProps {
  const uploader = (row.users ?? {}) as Record<string, unknown>;
  return {
    id: row.id as string,
    groupId: row.groupid as string,
    uploaderUid: row.uploaderuid as string,
    name: row.name as string,
    url: row.url as string,
    fileType: (row.filetype as GroupFileType) ?? "file",
    size: (row.size as number) ?? 0,
    isPinned: Boolean(row.ispinned),
    createdAt: row.createdat as string,
    uploaderUsername: (uploader.username as string) ?? undefined,
  };
}

export async function uploadGroupFile(input: {
  groupId: string;
  name: string;
  url: string;
  fileType: GroupFileType;
  size?: number;
}): Promise<GroupFileProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  return withSupabaseRequestContext(async client => {
    const id = crypto.randomUUID();
    const { error } = await client.from("group_files").insert({
      id,
      groupid: input.groupId,
      uploaderuid: uid,
      name: input.name,
      url: input.url,
      filetype: input.fileType,
      size: input.size ?? 0,
      ispinned: false,
      createdat: new Date().toISOString(),
    });
    if (error) throw error;

    return {
      id,
      groupId: input.groupId,
      uploaderUid: uid,
      name: input.name,
      url: input.url,
      fileType: input.fileType,
      size: input.size ?? 0,
      isPinned: false,
      createdAt: new Date().toISOString(),
    };
  });
}

export async function listGroupFiles(groupId: string): Promise<GroupFileProps[]> {
  return withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("group_files")
      .select("*, users:uploaderuid(username)")
      .eq("groupid", groupId)
      .order("ispinned", { ascending: false })
      .order("createdat", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(row => mapGroupFileRow(row as Record<string, unknown>));
  });
}

export async function pinGroupFile(fileId: string, pin: boolean): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { data: file } = await client
      .from("group_files")
      .select("groupid")
      .eq("id", fileId)
      .maybeSingle();
    if (!file) throw new Error("File not found");

    const { data: membership } = await client
      .from("group_members")
      .select("role")
      .eq("groupid", (file as { groupid: string }).groupid)
      .eq("uid", uid)
      .maybeSingle();
    const m = membership as { role: string } | null;
    if (!m || m.role !== "admin") throw new Error("Only admins can pin files");

    const { error } = await client.from("group_files").update({ ispinned: pin }).eq("id", fileId);
    if (error) throw error;
  });
}

export async function deleteGroupFile(fileId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { error } = await client.from("group_files").delete().eq("id", fileId);
    if (error) throw error;
  });
}

// ─── Join Requests ────────────────────────────────────────────────────────────

export type JoinRequestProps = {
  id: string;
  groupId: string;
  uid: string;
  requestedAt: string;
  username?: string;
  fullName?: string;
  photoURL?: string | null;
};

export async function listJoinRequests(groupId: string): Promise<JoinRequestProps[]> {
  return withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("group_join_requests")
      .select("*, users:uid(username, fullname, photourl)")
      .eq("groupid", groupId)
      .order("requestedat", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => {
      const r = row as Record<string, unknown>;
      const user = (r.users ?? {}) as Record<string, unknown>;
      return {
        id: r.id as string,
        groupId: r.groupid as string,
        uid: r.uid as string,
        requestedAt: r.requestedat as string,
        username: (user.username as string) ?? undefined,
        fullName: (user.fullname as string) ?? undefined,
        photoURL: (user.photourl as string) ?? null,
      };
    });
  });
}

export async function approveJoinRequest(groupId: string, requestUid: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    // Use the security-definer RPC which handles admin verification,
    // member insert, request deletion, and count sync atomically.
    const { error } = await client.rpc("approve_group_join_request", {
      p_group_id: groupId,
      p_request_uid: requestUid,
    });
    if (error) throw error;
  });
}

export async function rejectJoinRequest(groupId: string, requestUid: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { data: membership } = await client
      .from("group_members")
      .select("role")
      .eq("groupid", groupId)
      .eq("uid", uid)
      .maybeSingle();
    const m = membership as { role: string } | null;
    if (!m || m.role !== "admin") throw new Error("Only admins can reject requests");

    await client
      .from("group_join_requests")
      .delete()
      .eq("groupid", groupId)
      .eq("uid", requestUid);
  });
}

