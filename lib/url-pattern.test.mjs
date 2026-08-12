import assert from "node:assert/strict";
import test from "node:test";
import { extractFirstUrl, extractUrls, normalizeUrl } from "./url-pattern.mjs";

test("normalizeUrl upgrades bare domains", () => {
  assert.equal(normalizeUrl("example.com/path"), "https://example.com/path");
  assert.equal(normalizeUrl("https://example.com"), "https://example.com");
});

test("extractUrls finds the first matching link", () => {
  assert.deepEqual(extractUrls("hello example.com and https://openai.com"), [
    "https://example.com",
    "https://openai.com",
  ]);
  assert.equal(extractFirstUrl("no links here"), "");
});
