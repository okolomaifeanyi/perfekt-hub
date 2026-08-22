// Pure mapping from a Trakt /movies/trending entry to a curated_content row.
// Split out from movies.mjs (which pulls in @/lib/cron/curated-content.mjs,
// a "@/"-aliased import that only resolves inside the Next.js runtime) so
// this transform can run under this project's plain `node --test` runner —
// same split lib/link-safety.mjs uses relative to lib/links.ts, and the one
// curated-content-safety.mjs's own comments describe for the same reason.
export function toCuratedContent(entry) {
  const movie = entry?.movie;
  if (!movie?.title || !movie?.ids?.trakt) return null;

  const year = typeof movie.year === "number" ? ` (${movie.year})` : "";
  const watchers = typeof entry.watchers === "number" ? entry.watchers : null;

  return {
    category: "movie_news",
    title: `${movie.title}${year}`,
    body: watchers !== null ? `${watchers.toLocaleString("en-US")} people watching this now` : null,
    // Trakt's API is text/metadata only — it doesn't serve poster art the
    // way TMDB did. Deliberate trade-off for dropping TMDB (see movies.mjs),
    // not an oversight: movie_news cards render text-only.
    image_url: null,
    source_url: movie.ids.slug ? `https://trakt.tv/movies/${movie.ids.slug}` : null,
    source_name: "Trakt",
    external_id: `trakt-${movie.ids.trakt}`,
    metadata: {
      year: movie.year ?? null,
      watchers,
      imdbId: movie.ids.imdb ?? null,
      traktId: movie.ids.trakt,
    },
    // Same rationale as the TMDB version this replaces: "trending now" is a
    // moving snapshot, not tied to the movie's own release date — an older
    // film re-trending should surface near the top of a feed sorted by
    // published_at, not sink under its original release year.
    published_at: new Date().toISOString(),
  };
}
