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
  ownerUid: string;
  membersCount: number;
  createdAt: string;
  isMember?: boolean;
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
    ownerUid: row.owneruid as string,
    membersCount: (row.memberscount as number) ?? 0,
    createdAt: row.createdat as string,
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
      .insert({ id: crypto.randomUUID(), groupid: id, uid });
    if (memberError) throw memberError;

    return {
      id,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      photoURL: null,
      ownerUid: uid,
      membersCount: 1,
      createdAt: new Date().toISOString(),
    };
  });
}

export async function joinGroup(groupId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
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
