import test from "node:test";
import assert from "node:assert/strict";
import { isContextRelevant, formatCuratedContext, ALL_CURATED_CATEGORIES } from "./curated-context.mjs";

test("ALL_CURATED_CATEGORIES covers football and every news topic", () => {
  assert.ok(ALL_CURATED_CATEGORIES.includes("football_fixture"));
  assert.ok(ALL_CURATED_CATEGORIES.includes("crypto_news"));
  assert.ok(ALL_CURATED_CATEGORIES.includes("betting_prediction"));
});

test("ALL_CURATED_CATEGORIES excludes movie_news — TMDB's terms bar feeding TMDB content to an AI/chatbot application", () => {
  assert.equal(ALL_CURATED_CATEGORIES.includes("movie_news"), false);
});

test("ALL_CURATED_CATEGORIES includes match_summary", () => {
  assert.ok(ALL_CURATED_CATEGORIES.includes("match_summary"));
});

test("formatCuratedContext formats a match_summary row distinctly from a pre-match analysis", () => {
  const text = formatCuratedContext([
    {
      category: "match_summary",
      title: "Man City 3-0 Bournemouth",
      body: "Man City cruised to victory, as predicted.",
      published_at: "2026-08-16T16:00:00Z",
      metadata: {},
    },
  ]);
  assert.equal(text, "[AI-written match recap] Man City 3-0 Bournemouth — Man City cruised to victory, as predicted.");
});

test("isContextRelevant matches across every content domain", () => {
  assert.equal(isContextRelevant("When is the Chelsea game?"), true);
  assert.equal(isContextRelevant("what's bitcoin price doing"), true);
  assert.equal(isContextRelevant("any good movies out"), true);
  assert.equal(isContextRelevant("what's trending in tech"), true);
  assert.equal(isContextRelevant("latest gossip on celebrities"), true);
});

test("isContextRelevant ignores unrelated messages", () => {
  assert.equal(isContextRelevant("help me write a poem"), false);
  assert.equal(isContextRelevant(""), false);
  assert.equal(isContextRelevant(undefined), false);
});

test("formatCuratedContext returns null for no rows", () => {
  assert.equal(formatCuratedContext([]), null);
  assert.equal(formatCuratedContext(null), null);
});

test("formatCuratedContext formats a fixture, a result, a prediction, and generic news distinctly", () => {
  const text = formatCuratedContext([
    {
      category: "football_fixture",
      title: "Arsenal vs Coventry City",
      body: null,
      published_at: "2026-08-21T19:00:00Z",
      metadata: { competition: "Premier League" },
    },
    {
      category: "football_result",
      title: "Man City 3-0 Bournemouth",
      body: null,
      published_at: "2026-08-16T14:00:00Z",
      metadata: { competition: "Premier League", score: { home: 3, away: 0 } },
    },
    {
      category: "betting_prediction",
      title: "Arsenal vs Coventry City",
      body: "Predicted: Arsenal (1.30 avg odds, 77% implied)",
      published_at: "2026-08-21T19:00:00Z",
      metadata: {},
    },
    {
      category: "tech_news",
      title: "New chip announced",
      body: "A faster chip was announced today.",
      published_at: "2026-08-17T10:00:00Z",
      metadata: {},
    },
  ]);

  const lines = text.split("\n");
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^\[UPCOMING\] \(Premier League\) Arsenal vs Coventry City — /);
  assert.match(lines[1], /^\[FINAL\] \(Premier League\) Man City 3-0 Bournemouth 3-0 — /);
  assert.equal(lines[2], "[Prediction, from bookmaker odds] Arsenal vs Coventry City — Predicted: Arsenal (1.30 avg odds, 77% implied)");
  assert.equal(lines[3], "[Tech] New chip announced — A faster chip was announced today.");
});

test("formatCuratedContext caps items per category instead of letting one crowd out the rest", () => {
  const rows = Array.from({ length: 10 }).map((_, i) => ({
    category: "tech_news",
    title: `Story ${i}`,
    body: null,
    published_at: "2026-08-17T10:00:00Z",
    metadata: {},
  }));
  rows.push({
    category: "movie_news",
    title: "A movie story",
    body: null,
    published_at: "2026-08-17T10:00:00Z",
    metadata: {},
  });

  const text = formatCuratedContext(rows);
  const lines = text.split("\n");
  assert.equal(lines.length, 5); // 4 tech_news (capped) + 1 movie_news
  assert.ok(lines.some(line => line.includes("A movie story")));
});
