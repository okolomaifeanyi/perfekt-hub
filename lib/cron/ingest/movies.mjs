import { upsertCuratedContent } from "@/lib/cron/curated-content.mjs";
import { toCuratedContent } from "./movies-transform.mjs";

const API_URL = "https://api.trakt.tv/movies/trending";
const REQUEST_TIMEOUT_MS = 8000;
const TRENDING_LIMIT = 20;

// Swapped from TMDB to Trakt (2026-08-22): TMDB's commercial API license
// (required — see the note that used to live here, and lib/ai/curated-
// context.mjs) turned out to require contacting their sales team, who
// quoted $149 for a category that's one of a dozen this app ingests — not
// worth it. Trakt's API is free, and per their own staff on the developer
// forum ("There is no restriction to use the Trakt API for commercial
// use... there is no specific commercial use license"), usable here with
// no license process. Trade-off accepted deliberately: Trakt doesn't serve
// poster art, only text metadata (title, year, trending watcher count) —
// see movies-transform.mjs's toCuratedContent for exactly what that means
// for the resulting card. Trakt's binding Terms of Use page couldn't be
// independently verified from here (it blocks automated fetches) — the
// forum confirmation is a strong signal, not a substitute for reading the
// actual terms at app.trakt.tv/terms before relying on this long-term.
export async function runMoviesIngestion() {
  const clientId = process.env.TRAKT_CLIENT_ID;
  if (!clientId) {
    console.warn("runMoviesIngestion: TRAKT_CLIENT_ID not set, skipping");
    return { skipped: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let data;
  try {
    // Headers per Trakt's documented requirements (docs.trakt.tv/docs/required-headers):
    // trakt-api-key (this app's Client ID) and trakt-api-version are mandatory;
    // User-Agent is their stated convention, not a hard requirement, kept anyway.
    const response = await fetch(`${API_URL}?limit=${TRENDING_LIMIT}`, {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": clientId,
        "User-Agent": "PerfektHub/1.0.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    return { skipped: false, error: `Trakt: ${error.message}` };
  } finally {
    clearTimeout(timeout);
  }

  const entries = Array.isArray(data) ? data : [];
  const items = entries.map(toCuratedContent).filter(Boolean);

  const result = await upsertCuratedContent(items);
  return { skipped: false, ...result };
}
