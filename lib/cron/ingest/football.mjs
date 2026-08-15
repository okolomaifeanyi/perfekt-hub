import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/client";

// Free tier covers all five of these (confirmed against football-data.org's
// current plan page) under the same 10 req/min cap this module stays well
// under — one request per competition, per run.
const COMPETITIONS = [
  { code: "PL", name: "Premier League" },
  { code: "PD", name: "La Liga" },
  { code: "SA", name: "Serie A" },
  { code: "FL1", name: "Ligue 1" },
  { code: "BL1", name: "Bundesliga" },
];

const API_BASE = "https://api.football-data.org/v4";
const REQUEST_TIMEOUT_MS = 8000;
// Free-tier cap is 10 req/min; this module makes 5 requests per run, but a
// small stagger is cheap insurance if a fixtures run and a live-score poll
// ever land in the same window.
const REQUEST_STAGGER_MS = 300;

function categoryForStatus(status) {
  if (status === "IN_PLAY" || status === "PAUSED") return "football_live";
  if (status === "FINISHED" || status === "AWARDED") return "football_result";
  if (status === "SCHEDULED" || status === "TIMED") return "football_fixture";
  // POSTPONED / SUSPENDED / CANCELLED matches aren't useful in a scores feed.
  return null;
}

function matchTitle(match) {
  const home = match.homeTeam?.shortName || match.homeTeam?.name || "Home";
  const away = match.awayTeam?.shortName || match.awayTeam?.name || "Away";
  const score = match.score?.fullTime;

  if (typeof score?.home === "number" && typeof score?.away === "number") {
    return `${home} ${score.home}-${score.away} ${away}`;
  }
  return `${home} vs ${away}`;
}

function matchBody(match, competitionName) {
  if (match.status === "IN_PLAY" || match.status === "PAUSED") {
    const minute = typeof match.minute === "number" ? `${match.minute}'` : "Live";
    return `${competitionName} · ${match.status === "PAUSED" ? "Half-time" : minute}`;
  }
  if (typeof match.matchday === "number") {
    return `${competitionName} · Matchday ${match.matchday}`;
  }
  return competitionName;
}

function toCuratedContent(match, competition) {
  const category = categoryForStatus(match.status);
  if (!category) return null;

  return {
    category,
    title: matchTitle(match),
    body: matchBody(match, competition.name),
    image_url: match.competition?.emblem || null,
    source_url: null,
    source_name: "football-data.org",
    external_id: `fd-${match.id}`,
    metadata: {
      competition: competition.name,
      competitionCode: competition.code,
      status: match.status,
      minute: match.minute ?? null,
      matchday: match.matchday ?? null,
      utcDate: match.utcDate,
      homeTeam: {
        name: match.homeTeam?.name ?? null,
        shortName: match.homeTeam?.shortName ?? null,
        crest: match.homeTeam?.crest ?? null,
      },
      awayTeam: {
        name: match.awayTeam?.name ?? null,
        shortName: match.awayTeam?.shortName ?? null,
        crest: match.awayTeam?.crest ?? null,
      },
      score: match.score?.fullTime ?? null,
      halfTimeScore: match.score?.halfTime ?? null,
      winner: match.score?.winner ?? null,
    },
    published_at: match.utcDate,
  };
}

async function fetchCompetitionMatches(competition, apiKey, { dateFrom, dateTo }) {
  const url = `${API_BASE}/competitions/${competition.code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`football-data.org ${competition.code}: HTTP ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.matches) ? data.matches : [];
  } finally {
    clearTimeout(timeout);
  }
}

// A match moves through categories as it plays out (fixture -> live ->
// result). Each category transition is a different (category, external_id)
// pair, so a plain upsert would leave the old-category row behind forever
// instead of replacing it — this clears any sibling rows for the same match
// before the new row is written.
async function clearStaleCategoriesForMatch(admin, matchId, currentCategory) {
  const { error } = await admin
    .from("curated_content")
    .delete()
    .eq("external_id", `fd-${matchId}`)
    .neq("category", currentCategory);

  if (error) throw new Error(`clearStaleCategoriesForMatch: ${error.message}`);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export async function runFootballIngestion() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.warn("runFootballIngestion: FOOTBALL_DATA_API_KEY not set, skipping");
    return { skipped: true };
  }

  const today = new Date();
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateFrom = isoDate(yesterday);
  const dateTo = isoDate(weekAhead);

  const admin = getSupabaseAdminClient();
  const items = [];
  const errors = [];

  for (const [index, competition] of COMPETITIONS.entries()) {
    if (index > 0) await new Promise(resolve => setTimeout(resolve, REQUEST_STAGGER_MS));

    try {
      const matches = await fetchCompetitionMatches(competition, apiKey, { dateFrom, dateTo });
      for (const match of matches) {
        const item = toCuratedContent(match, competition);
        if (!item) continue;
        await clearStaleCategoriesForMatch(admin, match.id, item.category);
        items.push(item);
      }
    } catch (error) {
      errors.push(`${competition.code}: ${error.message}`);
    }
  }

  const result = await upsertCuratedContent(items);
  return { ...result, competitions: COMPETITIONS.length, errors };
}
