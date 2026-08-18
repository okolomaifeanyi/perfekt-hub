import test from "node:test";
import assert from "node:assert/strict";
import { formatPostsContext, isSafeToShare } from "./posts-context.mjs";

test("formatPostsContext returns null for no posts", () => {
  assert.equal(formatPostsContext([]), null);
  assert.equal(formatPostsContext(null), null);
});

test("formatPostsContext formats author, content, and recency", () => {
  const text = formatPostsContext([
    { username: "perfekt", content: "Luxury build", media: [], createdAt: new Date(Date.now() - 60 * 60 * 1000) },
  ]);
  assert.equal(text, '@perfekt: "Luxury build" — 1h ago');
});

test("formatPostsContext notes media and falls back for a missing username", () => {
  const text = formatPostsContext([
    { username: "", content: "check this out", media: [{ type: "image" }], createdAt: new Date() },
  ]);
  assert.match(text, /^someone: "check this out" \[with media\] — /);
});

test("formatPostsContext skips posts with empty content", () => {
  const text = formatPostsContext([
    { username: "a", content: "", media: [], createdAt: new Date() },
    { username: "b", content: "real post", media: [], createdAt: new Date() },
  ]);
  assert.equal(text, '@b: "real post" — 0m ago');
});

test("formatPostsContext truncates long content", () => {
  const long = "x".repeat(300);
  const text = formatPostsContext([{ username: "a", content: long, media: [], createdAt: new Date() }]);
  assert.ok(text.includes("…"));
  assert.ok(text.length < 300);
});

test("isSafeToShare excludes toxic or sensitive posts", () => {
  assert.equal(isSafeToShare({ textToxic: true }), false);
  assert.equal(isSafeToShare({ moderationStatus: "sensitive" }), false);
  assert.equal(isSafeToShare({ textToxic: false, moderationStatus: "safe" }), true);
  assert.equal(isSafeToShare({}), true);
});
