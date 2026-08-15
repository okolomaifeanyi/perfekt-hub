import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";

// "soccer_epl" and "soccer_spain_la_liga" are confirmed against The Odds
// API's own docs/marketing pages live. The other three follow the same
// `soccer_{country}_{league}` pattern used by every confirmed key, but
// couldn't be independently verified without an account — GET /v4/sports/
// (which doesn't consume API quota) lists every valid key and is the first
// thing to check against a real API key if a league below 404s.
const SPORT_KEYS = [
  { key: "soccer_epl", name: "Premier League" },
  { key: "soccer_spain_la_liga", name: "La Liga" },
  { key: "soccer_italy_serie_a", name: "Serie A" },
  { key: "soccer_france_ligue_one", name: "Ligue 1" },
  { key: "soccer_germany_bundesliga", name: "Bundesliga" },
];

const API_BASE = "https://api.the-odds-api.com/v4";
const REQUEST_TIMEOUT_MS = 8000;
const REQUEST_STAGGER_MS = 300;

async function fetchSportOdds(sportKey, apiKey) {
  const url = `${API_BASE}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=uk,eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Averages the h2h decimal odds for each outcome across every bookmaker in
// the event, converts to an implied win probability (1 / decimal odds), and
// picks the outcome with the highest implied probability as the
// "prediction" — this is the standard way to turn bookmaker odds into a
// single predicted outcome without needing a model of our own.
function predictOutcome(event) {
  const totals = new Map();

  for (const bookmaker of event.bookmakers || []) {
    const market = bookmaker.markets?.find(m => m.key === "h2h");
    for (const outcome of market?.outcomes || []) {
      if (typeof outcome.price !== "number" || outcome.price <= 0) continue;
      const entry = totals.get(outcome.name) || { sum: 0, count: 0 };
      entry.sum += outcome.price;
      entry.count += 1;
      totals.set(outcome.name, entry);
    }
  }

  let best = null;
  for (const [name, { sum, count }] of totals) {
    const avgOdds = sum / count;
    const impliedProbability = 1 / avgOdds;
    if (!best || impliedProbability > best.impliedProbability) {
      best = { name, avgOdds, impliedProbability };
    }
  }

  return best;
}

function toCuratedContent(event, league) {
  const prediction = predictOutcome(event);
  if (!prediction) return null;

  return {
    category: "betting_prediction",
    title: `${event.home_team} vs ${event.away_team}`,
    body: `Predicted: ${prediction.name} (${prediction.avgOdds.toFixed(2)} avg odds, ${Math.round(prediction.impliedProbability * 100)}% implied)`,
    image_url: null,
    source_url: null,
    source_name: "The Odds API",
    external_id: `odds-${event.id}`,
    metadata: {
      league: league.name,
      sportKey: league.key,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: event.commence_time,
      predictedWinner: prediction.name,
      predictedOdds: prediction.avgOdds,
      impliedProbability: prediction.impliedProbability,
      bookmakerCount: event.bookmakers?.length ?? 0,
    },
    published_at: event.commence_time,
  };
}

export async function runBettingIngestion() {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.warn("runBettingIngestion: ODDS_API_KEY not set, skipping");
    return { skipped: true };
  }

  const items = [];
  const errors = [];

  for (const [index, league] of SPORT_KEYS.entries()) {
    if (index > 0) await new Promise(resolve => setTimeout(resolve, REQUEST_STAGGER_MS));

    try {
      const events = await fetchSportOdds(league.key, apiKey);
      if (!Array.isArray(events)) throw new Error("unexpected response shape");

      for (const event of events) {
        const item = toCuratedContent(event, league);
        if (item) items.push(item);
      }
    } catch (error) {
      errors.push(`${league.key}: ${error.message}`);
    }
  }

  const result = await upsertCuratedContent(items);
  return { ...result, leagues: SPORT_KEYS.length, errors };
}
