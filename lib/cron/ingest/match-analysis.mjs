import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";
import { generateText } from "@/lib/ai/client.mjs";

const API_BASE = "https://api.football-data.org/v4";
const REQUEST_TIMEOUT_MS = 8000;

// One transient-failure retry per call (timeout, 5xx, or 429) — football-data.org
// occasionally hiccups on an individual request, and without this the whole
// fixture would be abandoned (or, for the optional stats, silently degrade
// to "no data") over what's often just a one-off blip.
const RETRY_DELAY_MS = 2000;

// Cost and serverless-timeout control: one LLM call plus up to four
// football-data.org calls per fixture (main match, home team's matches,
// away team's matches, head-to-head), generated once and cached forever
// (dedup'd by external_id — see below) — there's never a reason to
// regenerate an already-analyzed fixture. A small per-run batch, kept well
// under football-data.org's free-tier 10 req/min limit, keeps a single
// invocation comfortably inside its time budget; running this every couple
// of hours (see vercel.json) works through the backlog of upcoming
// fixtures over time rather than trying to do all of them in one run. Total
// LLM spend only scales with how many *distinct* fixtures ever get
// analyzed, not with how often the cron runs.
const MAX_MATCHES_PER_RUN = 2;
const FORM_LOOKBACK_DAYS = 200;
// If a team has zero finished matches in the primary window (very early
// season, or a side just promoted into a competition it wasn't in before),
// retry once with a much wider window before concluding there's genuinely
// nothing to report — covers last season's form for a team whose current
// competition-scoped record is still empty.
const WIDENED_FORM_LOOKBACK_DAYS = 400;
const FORM_MATCHES_TO_FETCH = 10;
const RECENT_FORM_SAMPLE = 5;
const VENUE_FORM_SAMPLE = 3;
const HEAD_TO_HEAD_MATCHES_TO_FETCH = 5;
// Matches within this window of a fixture's kickoff are treated as the same
// event when cross-referencing bookmaker odds — The Odds API and
// football-data.org are two independent sources with no shared id, so this
// (plus team-name matching) is the closest thing to a join available.
const ODDS_MATCH_WINDOW_MS = 48 * 60 * 60 * 1000;

const ANALYSIS_SYSTEM_PROMPT =
  "You are a football analyst writing a short pre-match analysis for a " +
  "sports app. You will be given real recent form (including home/away " +
  "splits and goals scored/conceded), league standings where available, " +
  "head-to-head history, and bookmaker odds where available for one " +
  "specific fixture. Write 2-4 sentences of grounded analysis using ONLY " +
  "the facts provided — never invent injuries, transfers, lineups, " +
  "managers, or history not given to you. If some data is missing (e.g. " +
  "no head-to-head history on record, or the season has just started with " +
  "no standings yet), say so plainly rather than padding with generic " +
  "filler. End with a single clearly-labeled prediction line, e.g. " +
  "\"Prediction: Arsenal to win\" or \"Prediction: Too close to call\" — " +
  "phrased as an informed read of the data you were given, never a " +
  "guarantee, and note if it agrees or disagrees with the bookmaker odds " +
  "when both are present.";

async function fetchJson(url, apiKey, { retried = false } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "X-Auth-Token": apiKey }, signal: controller.signal });
    if (!res.ok) {
      if (!retried && (res.status === 429 || res.status >= 500)) {
        clearTimeout(timeout);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return fetchJson(url, apiKey, { retried: true });
      }
      throw new Error(`football-data.org: HTTP ${res.status} for ${url}`);
    }
    return await res.json();
  } catch (error) {
    if (!retried && error.name === "AbortError") {
      clearTimeout(timeout);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return fetchJson(url, apiKey, { retried: true });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTeamMatches(teamId, apiKey) {
  const dateTo = new Date().toISOString().slice(0, 10);
  const primaryFrom = new Date(Date.now() - FORM_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const primary = await fetchJson(
    `${API_BASE}/teams/${teamId}/matches?status=FINISHED&dateFrom=${primaryFrom}&dateTo=${dateTo}&limit=${FORM_MATCHES_TO_FETCH}`,
    apiKey
  ).catch(() => null);
  if (primary?.matches?.length) return primary.matches;

  // Widen once rather than immediately reporting "no data" — a team can
  // easily have zero matches in a 200-day window three days into a new
  // season.
  const widenedFrom = new Date(Date.now() - WIDENED_FORM_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const widened = await fetchJson(
    `${API_BASE}/teams/${teamId}/matches?status=FINISHED&dateFrom=${widenedFrom}&dateTo=${dateTo}&limit=${FORM_MATCHES_TO_FETCH}`,
    apiKey
  ).catch(() => null);
  return widened?.matches ?? [];
}

function matchResult(match, teamId) {
  const isHome = match.homeTeam?.id === teamId;
  const goalsFor = isHome ? match.score?.fullTime?.home : match.score?.fullTime?.away;
  const goalsAgainst = isHome ? match.score?.fullTime?.away : match.score?.fullTime?.home;
  const opponent = isHome
    ? match.awayTeam?.shortName || match.awayTeam?.name
    : match.homeTeam?.shortName || match.homeTeam?.name;
  const outcome = goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
  return { isHome, goalsFor, goalsAgainst, opponent, outcome };
}

function summarizeResults(label, results) {
  if (results.length === 0) return `${label}: no matches on record.`;
  const line = results.map(r => `${r.outcome} ${r.goalsFor}-${r.goalsAgainst} vs ${r.opponent}`).join(", ");
  return `${label} (last ${results.length}): ${line}`;
}

function summarizeGoalAverage(label, results) {
  if (results.length === 0) return null;
  const goalsFor = results.reduce((sum, r) => sum + (r.goalsFor ?? 0), 0) / results.length;
  const goalsAgainst = results.reduce((sum, r) => sum + (r.goalsAgainst ?? 0), 0) / results.length;
  return `${label} averages ${goalsFor.toFixed(1)} scored / ${goalsAgainst.toFixed(1)} conceded per game over these matches.`;
}

// One team-matches fetch covers overall form, venue-specific form, and
// goal-average stats — filtering the same response three ways instead of
// making three separate calls for it.
function summarizeTeamForm(teamName, teamId, matches, venue) {
  const results = matches.map(match => matchResult(match, teamId));
  const overall = results.slice(0, RECENT_FORM_SAMPLE);
  const venueSpecific = results.filter(r => (venue === "home" ? r.isHome : !r.isHome)).slice(0, VENUE_FORM_SAMPLE);

  const lines = [
    summarizeResults(teamName, overall),
    summarizeResults(`${teamName} at ${venue}`, venueSpecific),
  ];
  const goalLine = summarizeGoalAverage(teamName, overall);
  if (goalLine) lines.push(goalLine);
  return lines.join("\n");
}

function summarizeHeadToHead(data, homeName, awayName) {
  if (!data || data.resultSet?.count === 0 || !data.matches?.length) {
    return `No head-to-head meetings on record between ${homeName} and ${awayName}.`;
  }

  const lines = data.matches.slice(0, HEAD_TO_HEAD_MATCHES_TO_FETCH).map(match => {
    const date = new Date(match.utcDate).toISOString().slice(0, 10);
    const home = match.homeTeam?.shortName || match.homeTeam?.name;
    const away = match.awayTeam?.shortName || match.awayTeam?.name;
    return `${date}: ${home} ${match.score?.fullTime?.home}-${match.score?.fullTime?.away} ${away}`;
  });

  return `Head-to-head (last ${lines.length} meetings): ${lines.join("; ")}`;
}

function summarizeStandings(standings, homeTeamId, awayTeamId, homeName, awayName) {
  const table = standings?.standings?.find(group => group.type === "TOTAL")?.table;
  if (!table) return null;

  const homeRow = table.find(row => row.team.id === homeTeamId);
  const awayRow = table.find(row => row.team.id === awayTeamId);
  if (!homeRow || !awayRow || (homeRow.playedGames === 0 && awayRow.playedGames === 0)) {
    return null; // season hasn't produced any results yet — nothing useful to say
  }

  const rowLine = (name, row) =>
    `${name}: ${row.position}${ordinalSuffix(row.position)}, ${row.points}pts from ${row.playedGames} played (GD ${row.goalDifference >= 0 ? "+" : ""}${row.goalDifference})`;

  return `League standings — ${rowLine(homeName, homeRow)}; ${rowLine(awayName, awayRow)}`;
}

function ordinalSuffix(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function normalizeTeamName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\b(fc|afc|cf|cd|sc)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function findMatchingOdds(oddsRows, homeName, awayName, kickoffIso) {
  const kickoff = new Date(kickoffIso).getTime();
  const normHome = normalizeTeamName(homeName);
  const normAway = normalizeTeamName(awayName);

  return (
    oddsRows.find(row => {
      const meta = row.metadata ?? {};
      const rowHome = normalizeTeamName(meta.homeTeam);
      const rowAway = normalizeTeamName(meta.awayTeam);
      const homeMatches = rowHome === normHome || rowHome.includes(normHome) || normHome.includes(rowHome);
      const awayMatches = rowAway === normAway || rowAway.includes(normAway) || normAway.includes(rowAway);
      if (!homeMatches || !awayMatches) return false;

      const commence = new Date(meta.commenceTime ?? row.published_at).getTime();
      return Number.isFinite(commence) && Math.abs(commence - kickoff) < ODDS_MATCH_WINDOW_MS;
    }) ?? null
  );
}

function summarizeOdds(oddsRow) {
  if (!oddsRow) return null;
  const meta = oddsRow.metadata ?? {};
  if (!meta.predictedWinner) return null;
  return `Bookmaker odds imply: ${meta.predictedWinner} (${Math.round((meta.impliedProbability ?? 0) * 100)}% implied probability, from ${meta.bookmakerCount ?? "several"} bookmakers).`;
}

async function buildMatchSummary(match, apiKey, { standings, oddsRow }) {
  const [homeMatches, awayMatches, headToHead] = await Promise.all([
    fetchTeamMatches(match.homeTeam.id, apiKey),
    fetchTeamMatches(match.awayTeam.id, apiKey),
    fetchJson(`${API_BASE}/matches/${match.id}/head2head?limit=${HEAD_TO_HEAD_MATCHES_TO_FETCH}`, apiKey).catch(
      () => null
    ),
  ]);

  const homeName = match.homeTeam.shortName || match.homeTeam.name;
  const awayName = match.awayTeam.shortName || match.awayTeam.name;

  const lines = [
    `Match: ${homeName} vs ${awayName} (${match.competition?.name ?? "unknown competition"}, kickoff ${match.utcDate})`,
    summarizeStandings(standings, match.homeTeam.id, match.awayTeam.id, homeName, awayName),
    summarizeTeamForm(homeName, match.homeTeam.id, homeMatches, "home"),
    summarizeTeamForm(awayName, match.awayTeam.id, awayMatches, "away"),
    summarizeHeadToHead(headToHead, homeName, awayName),
    summarizeOdds(oddsRow),
  ].filter(Boolean);

  return lines.join("\n");
}

export async function runMatchAnalysisIngestion() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.warn("runMatchAnalysisIngestion: FOOTBALL_DATA_API_KEY not set, skipping");
    return { skipped: true };
  }

  const admin = getSupabaseAdminClient();

  // Skip fixtures that already have an analysis before spending any
  // football-data.org calls or an LLM call on them.
  const { data: existing, error: existingError } = await admin
    .from("curated_content")
    .select("external_id")
    .eq("category", "match_analysis");
  if (existingError) throw new Error(`runMatchAnalysisIngestion: ${existingError.message}`);
  const existingIds = new Set((existing ?? []).map(row => row.external_id));

  const { data: fixtures, error: fixturesError } = await admin
    .from("curated_content")
    .select("external_id")
    .eq("category", "football_fixture")
    .order("published_at", { ascending: true })
    .limit(200);
  if (fixturesError) throw new Error(`runMatchAnalysisIngestion: ${fixturesError.message}`);

  const pending = (fixtures ?? [])
    .filter(row => row.external_id && !existingIds.has(`analysis-${row.external_id}`))
    .slice(0, MAX_MATCHES_PER_RUN);

  // Existing odds-based predictions (see lib/cron/ingest/betting.mjs) — one
  // query for the whole run, cross-referenced per fixture in memory rather
  // than a separate lookup each time.
  const { data: oddsRows } = await admin
    .from("curated_content")
    .select("metadata, published_at")
    .eq("category", "betting_prediction")
    .order("published_at", { ascending: false })
    .limit(200);

  const standingsCache = new Map();
  async function getStandings(competitionCode) {
    if (!competitionCode) return null;
    if (!standingsCache.has(competitionCode)) {
      standingsCache.set(
        competitionCode,
        fetchJson(`${API_BASE}/competitions/${competitionCode}/standings`, apiKey).catch(() => null)
      );
    }
    return standingsCache.get(competitionCode);
  }

  const items = [];
  const errors = [];

  for (const fixture of pending) {
    try {
      const matchId = fixture.external_id.replace(/^fd-/, "");
      const match = await fetchJson(`${API_BASE}/matches/${matchId}`, apiKey);
      const standings = await getStandings(match.competition?.code);

      const homeName = match.homeTeam.shortName || match.homeTeam.name;
      const awayName = match.awayTeam.shortName || match.awayTeam.name;
      const oddsRow = findMatchingOdds(oddsRows ?? [], homeName, awayName, match.utcDate);

      const summary = await buildMatchSummary(match, apiKey, { standings, oddsRow });

      const result = await generateText({
        system: ANALYSIS_SYSTEM_PROMPT,
        prompt: summary,
        maxTokens: 350,
      });

      items.push({
        category: "match_analysis",
        title: `${homeName} vs ${awayName}`,
        body: result.text.trim(),
        image_url: match.competition?.emblem || null,
        source_url: null,
        source_name: "Nwanne AI",
        external_id: `analysis-${fixture.external_id}`,
        metadata: {
          competition: match.competition?.name ?? null,
          matchId: match.id,
          homeTeam: {
            id: match.homeTeam.id,
            name: match.homeTeam.name,
            shortName: match.homeTeam.shortName,
            crest: match.homeTeam.crest,
          },
          awayTeam: {
            id: match.awayTeam.id,
            name: match.awayTeam.name,
            shortName: match.awayTeam.shortName,
            crest: match.awayTeam.crest,
          },
          kickoff: match.utcDate,
          usedOdds: Boolean(oddsRow),
          usedStandings: Boolean(standings),
          provider: result.provider,
        },
        published_at: new Date().toISOString(),
      });
    } catch (error) {
      errors.push(`${fixture.external_id}: ${error.message}`);
    }
  }

  const result = items.length > 0 ? await upsertCuratedContent(items) : { inserted: 0, upserted: 0, rejected: 0 };
  return {
    ...result,
    attempted: pending.length,
    remaining: fixtures.length - existingIds.size - pending.length,
    errors,
  };
}
