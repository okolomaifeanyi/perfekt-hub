import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";

const API_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const REQUEST_TIMEOUT_MS = 8000;
const OVERVIEW_MAX_LENGTH = 280;

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text || null;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

// TMDB_API_KEY is the "API Key (v3 auth)" value from a TMDB account's API
// settings page — the plain key, not the longer "API Read Access Token"
// (that one's a Bearer token for a different auth style; both work on this
// endpoint, but the plain key is simpler to paste into one env var).
export async function runMoviesIngestion() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn("runMoviesIngestion: TMDB_API_KEY not set, skipping");
    return { skipped: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let data;
  try {
    const response = await fetch(`${API_BASE}/trending/movie/day?api_key=${apiKey}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    return { skipped: false, error: `TMDB: ${error.message}` };
  } finally {
    clearTimeout(timeout);
  }

  const movies = Array.isArray(data?.results) ? data.results : [];
  const items = movies
    .filter(movie => movie?.id && movie?.title)
    .map(movie => ({
      category: "movie_news",
      title: movie.title,
      body: truncate(movie.overview, OVERVIEW_MAX_LENGTH),
      image_url: movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : null,
      source_url: `https://www.themoviedb.org/movie/${movie.id}`,
      source_name: "TMDB",
      external_id: `tmdb-${movie.id}`,
      metadata: {
        voteAverage: movie.vote_average ?? null,
        popularity: movie.popularity ?? null,
        releaseDate: movie.release_date || null,
      },
      // "Trending today" is a moving snapshot, not tied to the movie's own
      // release date — an older film re-trending should surface near the
      // top of a feed sorted by published_at, not sink under its original
      // release year.
      published_at: new Date().toISOString(),
    }));

  const result = await upsertCuratedContent(items);
  return { skipped: false, ...result };
}
