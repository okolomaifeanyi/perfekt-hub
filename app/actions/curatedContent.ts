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

export type TeamOption = {
  id: string;
  name: string;
  shortName: string | null;
  crest: string | null;
};

// Read-only content everyone can see, guests included (curated_content
// grants anon SELECT — see supabase/migrations/20260815030000_curated_content.sql)
// — the public client is enough, there's no per-user personalization here to
// need a session-aware client for.
// leagueCodes filters to specific football-data.org league codes (e.g.
// ["PL", "PD"]) via the metadata jsonb field set at ingestion time — omit it
// for the unfiltered "everything" view /updates uses. teamIds narrows
// further to matches involving any of those team IDs, home or away — a
// match's own team fields live at two different jsonb paths, so this needs
// an .or() filter rather than a single .in().
export async function getFootballScores(
  leagueCodes?: string[],
  teamIds?: string[]
): Promise<CuratedContentItem[]> {
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

  if (teamIds && teamIds.length > 0) {
    const idList = teamIds.join(",");
    query = query.or(`metadata->homeTeam->>id.in.(${idList}),metadata->awayTeam->>id.in.(${idList})`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Team rosters aren't ingested from a dedicated endpoint — they're derived
// from whatever matches are already in curated_content for that league,
// which is always a rolling week+ window, so every team plays at least once
// within it. Avoids a second football-data.org dependency just for a pick
// list.
export async function getTeamsForLeague(leagueCode: string): Promise<TeamOption[]> {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("curated_content")
    .select("metadata")
    .in("category", FOOTBALL_CATEGORIES)
    .eq("metadata->>competitionCode", leagueCode)
    .limit(200);

  if (error) throw new Error(error.message);

  const teams = new Map<string, TeamOption>();
  for (const row of data ?? []) {
    const meta = row.metadata as {
      homeTeam?: { id?: string | number | null; name?: string | null; shortName?: string | null; crest?: string | null };
      awayTeam?: { id?: string | number | null; name?: string | null; shortName?: string | null; crest?: string | null };
    };
    for (const team of [meta.homeTeam, meta.awayTeam]) {
      if (!team?.id || !team?.name) continue;
      const id = String(team.id);
      if (!teams.has(id)) {
        teams.set(id, { id, name: team.name, shortName: team.shortName ?? null, crest: team.crest ?? null });
      }
    }
  }

  return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Football news articles aren't team-tagged the way matches are — matched by
// team name/short name appearing in the title or body instead, the same
// fuzzy-match reasoning as getCountryNews.
export async function getTeamNews(teamNames: string[], limit = 10): Promise<CuratedContentItem[]> {
  if (teamNames.length === 0) return [];

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("curated_content")
    .select("*")
    .eq("category", "football_news")
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const needles = teamNames.map(name => name.toLowerCase());
  return (data ?? [])
    .filter(item => {
      const haystack = `${item.title} ${item.body ?? ""}`.toLowerCase();
      return needles.some(needle => haystack.includes(needle));
    })
    .slice(0, limit);
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
// Takes several countries at once — interests now let a visitor follow news
// from more than just their home country.
export async function getCountryNews(countryNames: string[], limit = 10): Promise<CuratedContentItem[]> {
  if (countryNames.length === 0) return [];

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("curated_content")
    .select("*")
    .in("category", COUNTRY_MATCHABLE_CATEGORIES)
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const needles = countryNames.map(name => name.toLowerCase());
  return (data ?? [])
    .filter(item => {
      const countries = (item.metadata as { country?: unknown })?.country;
      return (
        Array.isArray(countries) &&
        countries.some(c => typeof c === "string" && needles.some(needle => c.includes(needle)))
      );
    })
    .slice(0, limit);
}
