import test from "node:test";
import assert from "node:assert/strict";
import { toCuratedContent } from "./movies-transform.mjs";

function makeEntry(overrides = {}) {
  return {
    watchers: 214,
    movie: {
      title: "Dune: Part Three",
      year: 2026,
      ids: { trakt: 987654, slug: "dune-part-three-2026", imdb: "tt12345678", tmdb: 111222 },
    },
    ...overrides,
  };
}

test("toCuratedContent maps a well-formed Trakt trending entry", () => {
  const item = toCuratedContent(makeEntry());
  assert.equal(item.category, "movie_news");
  assert.equal(item.title, "Dune: Part Three (2026)");
  assert.equal(item.body, "214 people watching this now");
  assert.equal(item.image_url, null);
  assert.equal(item.source_url, "https://trakt.tv/movies/dune-part-three-2026");
  assert.equal(item.source_name, "Trakt");
  assert.equal(item.external_id, "trakt-987654");
  assert.deepEqual(item.metadata, { year: 2026, watchers: 214, imdbId: "tt12345678", traktId: 987654 });
  assert.ok(!Number.isNaN(new Date(item.published_at).getTime()));
});

test("toCuratedContent returns null when the movie has no title", () => {
  const entry = makeEntry();
  entry.movie.title = "";
  assert.equal(toCuratedContent(entry), null);
});

test("toCuratedContent returns null when the movie has no Trakt id", () => {
  const entry = makeEntry();
  delete entry.movie.ids.trakt;
  assert.equal(toCuratedContent(entry), null);
});

test("toCuratedContent returns null for a missing/malformed entry", () => {
  assert.equal(toCuratedContent(null), null);
  assert.equal(toCuratedContent({}), null);
  assert.equal(toCuratedContent({ movie: null }), null);
});

test("toCuratedContent omits the year suffix when year isn't a number", () => {
  const entry = makeEntry();
  delete entry.movie.year;
  const item = toCuratedContent(entry);
  assert.equal(item.title, "Dune: Part Three");
  assert.equal(item.metadata.year, null);
});

test("toCuratedContent sets body to null when watchers isn't a number", () => {
  const entry = makeEntry({ watchers: undefined });
  const item = toCuratedContent(entry);
  assert.equal(item.body, null);
  assert.equal(item.metadata.watchers, null);
});

test("toCuratedContent sets source_url to null when there's no slug", () => {
  const entry = makeEntry();
  delete entry.movie.ids.slug;
  const item = toCuratedContent(entry);
  assert.equal(item.source_url, null);
});
