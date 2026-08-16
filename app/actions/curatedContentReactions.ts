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

export type ReactionType = "like" | "dislike";

export type CuratedContentReactionSummary = {
  likeCount: number;
  dislikeCount: number;
  userReaction: ReactionType | null;
};

// Batched, not one call per card — a single /updates or Discover tab can
// render dozens of rows at once, and N separate round-trips per page would
// be a much worse tradeoff than fetching every visible row's reactions in
// one query and reducing counts client-side (row volume per item is small,
// so there's no need for a dedicated aggregate RPC).
export async function getCuratedContentReactions(
  contentIds: string[]
): Promise<Record<string, CuratedContentReactionSummary>> {
  if (contentIds.length === 0) return {};

  const { uid } = await getUserFromSession();
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("curated_content_reactions")
    .select("content_id, uid, type")
    .in("content_id", contentIds);
  if (error) throw error;

  const summaries: Record<string, CuratedContentReactionSummary> = {};
  for (const id of contentIds) {
    summaries[id] = { likeCount: 0, dislikeCount: 0, userReaction: null };
  }

  for (const row of data ?? []) {
    const summary = summaries[row.content_id as string];
    if (!summary) continue;
    if (row.type === "like") summary.likeCount += 1;
    else if (row.type === "dislike") summary.dislikeCount += 1;
    if (uid && row.uid === uid) summary.userReaction = row.type as ReactionType;
  }

  return summaries;
}

// Same on/off/switch toggle semantics as posts' like/dislike: reacting the
// same way again clears it, reacting the other way switches it, and the
// two counts are always mutually exclusive per visitor.
export async function toggleCuratedContentReaction(
  contentId: string,
  type: ReactionType
): Promise<CuratedContentReactionSummary> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  return withSupabaseRequestContext(async client => {
    const { data: existing, error: fetchError } = await client
      .from("curated_content_reactions")
      .select("type")
      .eq("content_id", contentId)
      .eq("uid", uid)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (existing?.type === type) {
      const { error } = await client
        .from("curated_content_reactions")
        .delete()
        .eq("content_id", contentId)
        .eq("uid", uid);
      if (error) throw error;
    } else {
      const { error } = await client
        .from("curated_content_reactions")
        .upsert({ content_id: contentId, uid, type });
      if (error) throw error;
    }

    const { data: rows, error: countError } = await client
      .from("curated_content_reactions")
      .select("type")
      .eq("content_id", contentId);
    if (countError) throw countError;

    const summary: CuratedContentReactionSummary = {
      likeCount: (rows ?? []).filter(row => row.type === "like").length,
      dislikeCount: (rows ?? []).filter(row => row.type === "dislike").length,
      userReaction: existing?.type === type ? null : type,
    };
    return summary;
  });
}
