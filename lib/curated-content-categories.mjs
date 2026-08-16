// Separate from app/actions/curatedContent.ts because a "use server" file
// may only export async functions — these plain constants need to be
// importable from both that server-actions file and client components.
export const FOOTBALL_CATEGORIES = ["football_fixture", "football_live", "football_result"];

export const NEWS_CATEGORY_FILTERS = [
  { value: "all", label: "All" },
  { value: "crypto_price", label: "Crypto prices" },
  { value: "crypto_news", label: "Crypto news" },
  { value: "betting_prediction", label: "Betting" },
  { value: "movie_news", label: "Movies" },
  { value: "music_news", label: "Music" },
  { value: "gossip_news", label: "Gossip" },
  { value: "video_trending", label: "Videos" },
  { value: "education_news", label: "Education" },
  { value: "tech_news", label: "Tech" },
  { value: "fraud_alert", label: "Fraud alerts" },
];

export const NEWS_CATEGORIES = NEWS_CATEGORY_FILTERS.filter(f => f.value !== "all").map(f => f.value);

// The subset of news topics ingested from NewsData.io, the only source that
// tags each article with a `country` array in its metadata (see
// lib/cron/ingest/news.mjs) — crypto_news (CryptoPanic), movie_news (TMDB),
// crypto_price, betting_prediction, and video_trending don't carry that
// field, so country-matching against them would just find nothing.
export const COUNTRY_MATCHABLE_CATEGORIES = [
  "tech_news",
  "education_news",
  "gossip_news",
  "music_news",
  "fraud_alert",
];

// Sport league codes football-data.org uses, paired with the label shown in
// the interests picker — kept here (not just inline in the ingestion route)
// since the Aside/Updates interest filters need the same list.
export const FOOTBALL_LEAGUES = [
  { code: "PL", name: "Premier League" },
  { code: "PD", name: "La Liga" },
  { code: "SA", name: "Serie A" },
  { code: "FL1", name: "Ligue 1" },
  { code: "BL1", name: "Bundesliga" },
];
