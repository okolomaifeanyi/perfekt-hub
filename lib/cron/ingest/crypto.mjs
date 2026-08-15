import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";

const COINGECKO_MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&price_change_percentage=24h";

const REQUEST_TIMEOUT_MS = 8000;

async function fetchJson(url, { headers } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function formatUsd(value) {
  if (typeof value !== "number") return null;
  if (value >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value.toPrecision(4);
}

// No API key required on CoinGecko's public demo tier for this endpoint
// (confirmed live) — coingecko doesn't gate /coins/markets behind auth, just
// a lower unauthenticated rate limit, which a once-every-few-minutes cron
// run stays well under.
async function ingestCryptoPrices() {
  let coins;
  try {
    coins = await fetchJson(COINGECKO_MARKETS_URL);
  } catch (error) {
    return { skipped: false, error: `CoinGecko: ${error.message}` };
  }

  if (!Array.isArray(coins)) return { skipped: false, error: "CoinGecko: unexpected response shape" };

  const items = coins
    .filter(coin => coin?.id && typeof coin.current_price === "number")
    .map(coin => {
      const change = coin.price_change_percentage_24h;
      const changeLabel =
        typeof change === "number" ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : null;

      return {
        category: "crypto_price",
        title: `${coin.name} (${coin.symbol?.toUpperCase() ?? "?"}) $${formatUsd(coin.current_price)}`,
        body: changeLabel ? `24h: ${changeLabel}` : null,
        image_url: coin.image || null,
        source_url: `https://www.coingecko.com/en/coins/${coin.id}`,
        source_name: "CoinGecko",
        external_id: `cg-${coin.id}`,
        metadata: {
          coinId: coin.id,
          symbol: coin.symbol,
          priceUsd: coin.current_price,
          marketCap: coin.market_cap ?? null,
          marketCapRank: coin.market_cap_rank ?? null,
          priceChangePercentage24h: change ?? null,
        },
        published_at: coin.last_updated || new Date().toISOString(),
      };
    });

  const result = await upsertCuratedContent(items);
  return { skipped: false, ...result };
}

// CryptoPanic's exact free-plan URL segment and post-object field names
// aren't independently verifiable without an account (their docs page
// blocks automated fetches, and the API itself requires a token to try
// live) — CRYPTOPANIC_API_PLAN defaults to the commonly-documented "free"
// value but is overridable via env in case that's wrong once a real key is
// in place. The field mapping below falls back across the most commonly
// documented shapes; if this needs correcting, log the raw response first
// rather than guessing again.
async function ingestCryptoNews() {
  const apiKey = process.env.CRYPTOPANIC_API_KEY;
  if (!apiKey) {
    console.warn("ingestCryptoNews: CRYPTOPANIC_API_KEY not set, skipping");
    return { skipped: true };
  }

  const plan = process.env.CRYPTOPANIC_API_PLAN || "free";
  const url = `https://cryptopanic.com/api/${plan}/v2/posts/?auth_token=${apiKey}&public=true&filter=hot`;

  let data;
  try {
    data = await fetchJson(url);
  } catch (error) {
    return { skipped: false, error: `CryptoPanic: ${error.message}` };
  }

  const posts = Array.isArray(data?.results) ? data.results : [];
  const items = posts
    .filter(post => post?.id && post?.title)
    .map(post => ({
      category: "crypto_news",
      title: post.title,
      body: null,
      image_url: post.metadata?.image || null,
      source_url: post.url || post.original_url || null,
      source_name: post.source?.title || post.source?.domain || "CryptoPanic",
      external_id: `cp-${post.id}`,
      metadata: {
        currencies: post.currencies || [],
        kind: post.kind || null,
        votes: post.votes || null,
      },
      published_at: post.published_at || post.created_at || new Date().toISOString(),
    }));

  const result = await upsertCuratedContent(items);
  return { skipped: false, ...result };
}

export async function runCryptoIngestion() {
  const [prices, news] = await Promise.all([ingestCryptoPrices(), ingestCryptoNews()]);
  return { prices, news };
}
