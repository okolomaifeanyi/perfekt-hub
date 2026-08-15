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
