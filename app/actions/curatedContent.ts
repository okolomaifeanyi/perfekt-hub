"use server";

import { getSupabasePublicClient } from "@/lib/supabase/client";
import { FOOTBALL_CATEGORIES, NEWS_CATEGORIES } from "@/lib/curated-content-categories.mjs";

export type CuratedContentItem = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  image_url: string | null;
  source_url: string | null;
  source_name: string;
  external_id: string | null;
  metadata: Record<string, unknown>;
  published_at: string;
};

// Read-only content everyone can see, guests included (curated_content
// grants anon SELECT — see supabase/migrations/20260815030000_curated_content.sql)
// — the public client is enough, there's no per-user personalization here to
// need a session-aware client for.
export async function getFootballScores(): Promise<CuratedContentItem[]> {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("curated_content")
    .select("*")
    .in("category", FOOTBALL_CATEGORIES)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getNewsFeed(category?: string, limit = 30): Promise<CuratedContentItem[]> {
  const supabase = getSupabasePublicClient();
  let query = supabase
    .from("curated_content")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);

  query = category && category !== "all" ? query.eq("category", category) : query.in("category", NEWS_CATEGORIES);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
