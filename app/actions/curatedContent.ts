"use server";

import { getSupabasePublicClient } from "@/lib/supabase/client";
import {
  FOOTBALL_CATEGORIES,
  NEWS_CATEGORIES,
  COUNTRY_MATCHABLE_CATEGORIES,
} from "@/lib/curated-content-categories.mjs";

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
// leagueCodes filters to specific football-data.org league codes (e.g.
// ["PL", "PD"]) via the metadata jsonb field set at ingestion time — omit it
// for the unfiltered "everything" view /updates uses.
export async function getFootballScores(leagueCodes?: string[]): Promise<CuratedContentItem[]> {
  const supabase = getSupabasePublicClient();
  let query = supabase
    .from("curated_content")
    .select("*")
    .in("category", FOOTBALL_CATEGORIES)
    .order("published_at", { ascending: false })
    .limit(100);

  if (leagueCodes && leagueCodes.length > 0) {
    query = query.in("metadata->>competitionCode", leagueCodes);
  }

  const { data, error } = await query;
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

// Same shape as getNewsFeed but for a specific set of topics at once (an
// interests picker selects several categories, not just one) — used by
// Aside's "News for you" rail and /updates' interest-filtered default.
export async function getInterestedNews(topics: string[], limit = 20): Promise<CuratedContentItem[]> {
  if (topics.length === 0) return [];

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("curated_content")
    .select("*")
    .in("category", topics)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

// NewsData.io tags each article with a `country` array of lowercase country
// names, but not always the exact common name — the US comes back as
// "united states of america", confirmed against real ingested data — so
// this fetches a broad recent pool from the categories that actually carry
// that field (see COUNTRY_MATCHABLE_CATEGORIES) and matches with .includes()
// rather than an exact jsonb-containment filter, which would miss it.
export async function getCountryNews(countryName: string, limit = 10): Promise<CuratedContentItem[]> {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("curated_content")
    .select("*")
    .in("category", COUNTRY_MATCHABLE_CATEGORIES)
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const needle = countryName.toLowerCase();
  return (data ?? [])
    .filter(item => {
      const countries = (item.metadata as { country?: unknown })?.country;
      return Array.isArray(countries) && countries.some(c => typeof c === "string" && c.includes(needle));
    })
    .slice(0, limit);
}
