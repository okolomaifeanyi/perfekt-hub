import assert from "node:assert/strict";
import test from "node:test";
import { extractLinks, normalizeUrl } from "./link-parser.mjs";

test("normalizeUrl upgrades bare domains and preserves absolute urls", () => {
  assert.equal(normalizeUrl("example.com/path"), "https://example.com/path");
  assert.equal(normalizeUrl("https://example.com"), "https://example.com");
  assert.equal(normalizeUrl("   https://example.com  "), "https://example.com");
});

test("extractLinks finds and normalizes links in text", () => {
  assert.deepEqual(
    extractLinks("See example.com and https://openai.com plus www.test.dev/path"),
    [
      "https://example.com",
      "https://openai.com",
      "https://www.test.dev/path",
    ]
  );
});
