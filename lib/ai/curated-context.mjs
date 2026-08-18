import { FOOTBALL_CATEGORIES, NEWS_CATEGORIES, NEWS_CATEGORY_FILTERS } from "../curated-content-categories.mjs";

// Nwanne (the AI assistant, see app/actions/assistant.ts) is a plain LLM
// chat with no retrieval of its own — asked "when is the Chelsea game?" it
// had nothing to answer from and (correctly, given no data) said it has no
// real-time access. This gives it every category of curated_content — the
// same public, already-ingested data /updates and Discover show everyone —
// to work from instead, so answers are grounded in what actually got
// fetched from football-data.org, The Odds API, NewsData.io, etc. rather
// than the model guessing. Deliberately excludes anything account-specific
// (posts, messages, profile data) — see ASSISTANT_SYSTEM_PROMPT's own
// boundary on that, which this doesn't touch.
export const ALL_CURATED_CATEGORIES = [...FOOTBALL_CATEGORIES, ...NEWS_CATEGORIES];

const CATEGORY_LABELS = Object.fromEntries(NEWS_CATEGORY_FILTERS.map(filter => [filter.value, filter.label]));

// Broad on purpose — every topic curated_content actually covers, plus
// generic "what's going on" phrasing and mentions of posts/people on the
// platform itself (this same gate also decides whether to fetch public
// posts — see getPostsContext in app/actions/assistant.ts). False positives
// just mean an unrelated message pays for a Supabase query it didn't need;
// false negatives mean Nwanne wrongly claims no access again, which is the
// worse failure mode.
const RELEVANCE_KEYWORDS =
  /\b(game|match(?:es)?|score|fixture|kick[\s-]?off|play(?:ing|s)?|result|win(?:s)?|lose|lost|beat|predict(?:ion)?s?|odds|versus|vs\.?|league|table|standings?|news|update[sd]?|happening|trending|latest|headlines?|crypto|bitcoin|ethereum|coin|price|movie(?:s)?|film(?:s)?|cinema|album|song|music|artist|celebrity|gossip|scam|fraud|startup|tech(?:nology)?|gadget|\bai\b|education|school|university|student|post(?:s|ed|ing)?|feed|share[ds]?|everyone|people|saying|talking|perfekthub|group[s]?|community|communities)\b/i;

export function isContextRelevant(message) {
  return typeof message === "string" && RELEVANCE_KEYWORDS.test(message);
}

function formatKickoff(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown time";
  return (
    date.toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}

function formatRow(row) {
  if (FOOTBALL_CATEGORIES.includes(row.category)) {
    const meta = row.metadata ?? {};
    const status =
      row.category === "football_live" ? "LIVE" : row.category === "football_result" ? "FINAL" : "UPCOMING";
    const competition = meta.competition ? ` (${meta.competition})` : "";
    const score =
      typeof meta.score?.home === "number" && typeof meta.score?.away === "number"
        ? ` ${meta.score.home}-${meta.score.away}`
        : "";
    return `[${status}]${competition} ${row.title}${score} — ${formatKickoff(row.published_at)}`;
  }

  if (row.category === "betting_prediction") {
    return `[Prediction, from bookmaker odds] ${row.title} — ${row.body ?? ""}`;
  }

  const label = CATEGORY_LABELS[row.category] ?? row.category;
  const snippet = row.body ? ` — ${row.body}` : "";
  return `[${label}] ${row.title}${snippet}`;
}

const ITEMS_PER_CATEGORY = 4;

/**
 * @param {Array<{ category: string; title: string; body: string | null; published_at: string; metadata: Record<string, unknown> }>} rows
 * @returns {string | null}
 */
export function formatCuratedContext(rows) {
  if (!rows || rows.length === 0) return null;

  // Cap per category so whichever one ingests most often (usually a news
  // topic) can't crowd the rest out of the snapshot entirely.
  const seenPerCategory = new Map();
  const capped = [];
  for (const row of rows) {
    const count = seenPerCategory.get(row.category) ?? 0;
    if (count >= ITEMS_PER_CATEGORY) continue;
    seenPerCategory.set(row.category, count + 1);
    capped.push(row);
  }

  return capped.map(formatRow).join("\n");
}
