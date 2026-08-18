import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";
import { generateText } from "@/lib/ai/client.mjs";

const API_BASE = "https://api.football-data.org/v4";
const REQUEST_TIMEOUT_MS = 8000;
// More football-data.org calls per match here (form x2 + head-to-head) than
// the plain fixtures/scores cron, so a longer stagger keeps this well under
// the free tier's 10 req/min even if a live-score poll lands in the same
// window.
const REQUEST_STAGGER_MS = 700;

// Cost and serverless-timeout control: one LLM call plus up to three
// football-data.org calls per match, generated once and cached forever
// (dedup'd by external_id — see below) — there's never a reason to
// regenerate an already-analyzed fixture. A small per-run batch keeps a
// single invocation comfortably inside its time budget and bounds LLM
// spend per run; running this periodically works through the backlog of
// upcoming fixtures over time rather than trying to do all of them at once.
const MAX_MATCHES_PER_RUN = 5;
const FORM_LOOKBACK_DAYS = 200;
const FORM_MATCHES_TO_FETCH = 5;
const HEAD_TO_HEAD_MATCHES_TO_FETCH = 5;

const ANALYSIS_SYSTEM_PROMPT =
  "You are a football analyst writing a short pre-match analysis for a " +
  "sports app. You will be given real recent form, head-to-head history, " +
  "and match details for one specific fixture. Write 2-4 sentences of " +
  "grounded analysis using ONLY the facts provided — never invent " +
  "injuries, transfers, lineups, managers, or history not given to you. " +
  "If the data is limited (e.g. no head-to-head history on record, or the " +
  "season has just started with no form yet), say so plainly rather than " +
  "padding with generic filler. End with a single clearly-labeled " +
  "prediction line, e.g. \"Prediction: Arsenal to win\" or \"Prediction: " +
  "Too close to call\" — phrased as an informed read of the data you were " +
  "given, never a guarantee.";

async function fetchJson(url, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "X-Auth-Token": apiKey }, signal: controller.signal });
    if (!res.ok) throw new Error(`football-data.org: HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeForm(teamName, teamId, matches) {
  if (!matches || matches.length === 0) {
    return `${teamName}: no recent finished matches on record.`;
  }

  const results = matches.map(match => {
    const isHome = match.homeTeam?.id === teamId;
    const goalsFor = isHome ? match.score?.fullTime?.home : match.score?.fullTime?.away;
    const goalsAgainst = isHome ? match.score?.fullTime?.away : match.score?.fullTime?.home;
    const opponent = isHome
      ? match.awayTeam?.shortName || match.awayTeam?.name
      : match.homeTeam?.shortName || match.homeTeam?.name;
    const outcome = goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
    return `${outcome} ${goalsFor}-${goalsAgainst} vs ${opponent}`;
  });

  return `${teamName} last ${results.length}: ${results.join(", ")}`;
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

async function buildMatchSummary(match, apiKey) {
  const dateTo = new Date().toISOString().slice(0, 10);
  const dateFrom = new Date(Date.now() - FORM_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [homeForm, awayForm, headToHead] = await Promise.all([
    fetchJson(
      `${API_BASE}/teams/${match.homeTeam.id}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=${FORM_MATCHES_TO_FETCH}`,
      apiKey
    ).catch(() => null),
    fetchJson(
      `${API_BASE}/teams/${match.awayTeam.id}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=${FORM_MATCHES_TO_FETCH}`,
      apiKey
    ).catch(() => null),
    fetchJson(`${API_BASE}/matches/${match.id}/head2head?limit=${HEAD_TO_HEAD_MATCHES_TO_FETCH}`, apiKey).catch(
      () => null
    ),
  ]);

  const homeName = match.homeTeam.shortName || match.homeTeam.name;
  const awayName = match.awayTeam.shortName || match.awayTeam.name;

  return [
    `Match: ${homeName} vs ${awayName} (${match.competition?.name ?? "unknown competition"}, kickoff ${match.utcDate})`,
    summarizeForm(homeName, match.homeTeam.id, homeForm?.matches),
    summarizeForm(awayName, match.awayTeam.id, awayForm?.matches),
    summarizeHeadToHead(headToHead, homeName, awayName),
  ].join("\n");
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

  const items = [];
  const errors = [];

  for (const [index, fixture] of pending.entries()) {
    if (index > 0) await new Promise(resolve => setTimeout(resolve, REQUEST_STAGGER_MS));

    try {
      const matchId = fixture.external_id.replace(/^fd-/, "");
      const match = await fetchJson(`${API_BASE}/matches/${matchId}`, apiKey);
      const summary = await buildMatchSummary(match, apiKey);

      const result = await generateText({
        system: ANALYSIS_SYSTEM_PROMPT,
        prompt: summary,
        maxTokens: 300,
      });

      const homeName = match.homeTeam.shortName || match.homeTeam.name;
      const awayName = match.awayTeam.shortName || match.awayTeam.name;

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
          provider: result.provider,
        },
        published_at: new Date().toISOString(),
      });
    } catch (error) {
      errors.push(`${fixture.external_id}: ${error.message}`);
    }
  }

  const result = items.length > 0 ? await upsertCuratedContent(items) : { inserted: 0, upserted: 0, rejected: 0 };
  return { ...result, attempted: pending.length, remaining: fixtures.length - existingIds.size - pending.length, errors };
}
