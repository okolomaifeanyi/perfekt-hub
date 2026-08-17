"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient, getSupabasePublicClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  return runWithSupabaseClient(supabase, () => callback(supabase));
}

// Called once per visit to a content item's detail page (see
// app/(dashboard)/updates/[id]/page.tsx) — best-effort, swallows errors
// since a lost view on a rare failed RPC call isn't worth failing the page
// render over. Uses a security-definer RPC (see the migration) since
// curated_content itself only grants UPDATE to service_role, and
// `view_count = view_count + 1` isn't expressible through a plain .update()
// call anyway.
export async function incrementCuratedContentView(contentId: string): Promise<void> {
  try {
    const supabase = getSupabasePublicClient();
    await supabase.rpc("increment_curated_content_view", { p_content_id: contentId });
  } catch {
    // best-effort
  }
}

export type CuratedContentComment = {
  id: string;
  contentId: string;
  uid: string;
  body: string;
  createdAt: string;
  author: { username: string; fullName: string; photoURL: string | null } | null;
};

function mapCommentRow(row: Record<string, unknown>): CuratedContentComment {
  const profile = (row.users ?? null) as Record<string, unknown> | null;
  return {
    id: row.id as string,
    contentId: row.content_id as string,
    uid: row.uid as string,
    body: row.body as string,
    createdAt: row.createdat as string,
    author: profile
      ? {
          username: (profile.username as string) ?? "",
          fullName: (profile.fullname as string) ?? "",
          photoURL: (profile.photourl as string | null) ?? null,
        }
      : null,
  };
}

export async function getCuratedContentComments(contentId: string): Promise<CuratedContentComment[]> {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("curated_content_comments")
    .select("id, content_id, uid, body, createdat, users:uid(username, fullname, photourl)")
    .eq("content_id", contentId)
    .order("createdat", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => mapCommentRow(row as unknown as Record<string, unknown>));
}

export async function addCuratedContentComment(
  contentId: string,
  body: string
): Promise<CuratedContentComment> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment can't be empty");
  if (trimmed.length > 500) throw new Error("Comment is too long");

  return withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("curated_content_comments")
      .insert({ content_id: contentId, uid, body: trimmed })
      .select("id, content_id, uid, body, createdat, users:uid(username, fullname, photourl)")
      .single();
    if (error) throw error;
    return mapCommentRow(data as unknown as Record<string, unknown>);
  });
}

export async function deleteCuratedContentComment(commentId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { error } = await client
      .from("curated_content_comments")
      .delete()
      .eq("id", commentId)
      .eq("uid", uid);
    if (error) throw error;
  });
}
