import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";

const API_URL = "https://newsdata.io/api/1/latest";
const REQUEST_TIMEOUT_MS = 8000;
const REQUEST_STAGGER_MS = 300;
const DESCRIPTION_MAX_LENGTH = 280;

// NewsData.io's fixed category taxonomy has "technology", "education", and
// "crime" but no "gossip"/"music"/"fraud" categories of their own, so those
// three narrow a broad category with a keyword search instead.
const NEWS_TOPICS = [
  { category: "tech_news", params: { category: "technology" } },
  { category: "education_news", params: { category: "education" } },
  { category: "gossip_news", params: { category: "entertainment", q: "celebrity" } },
  { category: "music_news", params: { category: "entertainment", q: "music" } },
  { category: "fraud_alert", params: { category: "crime", q: "fraud OR scam" } },
];

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text || null;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

async function fetchTopic(topic, apiKey) {
  const params = new URLSearchParams({ apikey: apiKey, language: "en", ...topic.params });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data?.results) ? data.results : [];
  } finally {
    clearTimeout(timeout);
  }
}

function toCuratedContent(article, category) {
  if (!article?.article_id || !article?.title || !article?.link) return null;

  return {
    category,
    title: article.title,
    body: truncate(article.description, DESCRIPTION_MAX_LENGTH),
    image_url: article.image_url || null,
    source_url: article.link,
    source_name: article.source_name || article.source_id || "NewsData.io",
    external_id: `nd-${article.article_id}`,
    metadata: {
      sourceId: article.source_id || null,
      keywords: article.keywords || null,
      country: article.country || null,
    },
    published_at: article.pubDate || new Date().toISOString(),
  };
}

export async function runNewsIngestion() {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    console.warn("runNewsIngestion: NEWSDATA_API_KEY not set, skipping");
    return { skipped: true };
  }

  const items = [];
  const errors = [];

  for (const [index, topic] of NEWS_TOPICS.entries()) {
    if (index > 0) await new Promise(resolve => setTimeout(resolve, REQUEST_STAGGER_MS));

    try {
      const articles = await fetchTopic(topic, apiKey);
      for (const article of articles) {
        const item = toCuratedContent(article, topic.category);
        if (item) items.push(item);
      }
    } catch (error) {
      errors.push(`${topic.category}: ${error.message}`);
    }
  }

  const result = await upsertCuratedContent(items);
  return { ...result, topics: NEWS_TOPICS.length, errors };
}
