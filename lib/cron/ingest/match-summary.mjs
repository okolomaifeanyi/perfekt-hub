import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";
import { generateText } from "@/lib/ai/client.mjs";
import { formatGoals, formatBookings, buildRecapPrompt } from "./match-summary-recap.mjs";

const API_BASE = "https://api.football-data.org/v4";
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 2000;

// One football-data.org call (the match detail, which — for finished
// matches — includes goals/bookings where the competition's tier exposes
// them) plus one LLM call per result. Much cheaper than match-analysis.mjs's
// per-fixture cost (no team-form/head-to-head/standings fetches needed for a
// recap), so a larger per-run batch is safe while staying well under
// football-data.org's free-tier 10 req/min cap.
const MAX_MATCHES_PER_RUN = 5;

const RECAP_SYSTEM_PROMPT =
  "You are a football writer producing a short post-match recap for a " +
  "sports app. You will be given the final score and, where available, the " +
  "goal-by-goal record and cards for one specific finished match, plus " +
  "(when one exists) the pre-match prediction that was made for it. Write " +
  "2-4 sentences reporting what actually happened, using ONLY the facts " +
  "provided — never invent scorers, stats, or incidents not given to you. " +
  "If a pre-match prediction was provided, explicitly say whether it was " +
  "right, wrong, or partially right and why. If no prediction was made, " +
  "just recap the match. If goal-by-goal detail is missing, recap from the " +
  "final score alone rather than padding with invented detail.";

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

export async function runMatchSummaryIngestion() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.warn("runMatchSummaryIngestion: FOOTBALL_DATA_API_KEY not set, skipping");
    return { skipped: true };
  }

  const admin = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("curated_content")
    .select("external_id")
    .eq("category", "match_summary");
  if (existingError) throw new Error(`runMatchSummaryIngestion: ${existingError.message}`);
  const existingIds = new Set((existing ?? []).map(row => row.external_id));

  const { data: results, error: resultsError } = await admin
    .from("curated_content")
    .select("external_id")
    .eq("category", "football_result")
    .order("published_at", { ascending: true })
    .limit(200);
  if (resultsError) throw new Error(`runMatchSummaryIngestion: ${resultsError.message}`);

  const pending = (results ?? [])
    .filter(row => row.external_id && !existingIds.has(`summary-${row.external_id}`))
    .slice(0, MAX_MATCHES_PER_RUN);

  const items = [];
  const errors = [];

  for (const result of pending) {
    try {
      const matchId = result.external_id.replace(/^fd-/, "");
      const match = await fetchJson(`${API_BASE}/matches/${matchId}`, apiKey);

      const homeName = match.homeTeam.shortName || match.homeTeam.name;
      const awayName = match.awayTeam.shortName || match.awayTeam.name;

      const { data: prediction } = await admin
        .from("curated_content")
        .select("body")
        .eq("category", "match_analysis")
        .eq("external_id", `analysis-${result.external_id}`)
        .maybeSingle();

      const prompt = buildRecapPrompt({
        homeName,
        awayName,
        competition: match.competition?.name,
        kickoff: match.utcDate,
        finalScore: match.score?.fullTime,
        goalsLine: formatGoals(match.goals, match.homeTeam.id),
        bookingsLine: formatBookings(match.bookings, match.homeTeam.id),
        predictionBody: prediction?.body ?? null,
      });

      const llmResult = await generateText({
        system: RECAP_SYSTEM_PROMPT,
        prompt,
        maxTokens: 300,
      });

      items.push({
        category: "match_summary",
        title: `${homeName} ${match.score?.fullTime?.home ?? "?"}-${match.score?.fullTime?.away ?? "?"} ${awayName}`,
        body: llmResult.text.trim(),
        image_url: match.competition?.emblem || null,
        source_url: null,
        source_name: "Nwanne AI",
        external_id: `summary-${result.external_id}`,
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
          finalScore: match.score?.fullTime ?? null,
          hadPrediction: Boolean(prediction?.body),
          provider: llmResult.provider,
        },
        published_at: new Date().toISOString(),
      });
    } catch (error) {
      errors.push(`${result.external_id}: ${error.message}`);
    }
  }

  const upsertResult = items.length > 0 ? await upsertCuratedContent(items) : { inserted: 0, upserted: 0, rejected: 0 };
  return {
    ...upsertResult,
    attempted: pending.length,
    remaining: results.length - existingIds.size - pending.length,
    errors,
  };
}
