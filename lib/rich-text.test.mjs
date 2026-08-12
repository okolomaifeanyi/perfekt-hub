import assert from "node:assert/strict";
import test from "node:test";
import { extractMentionUsernames, tokenizeRichText } from "./rich-text.mjs";

test("extractMentionUsernames deduplicates mentions and ignores emails", () => {
  assert.deepEqual(
    extractMentionUsernames("Hi @Alice and @alice. Reach me at alice@example.com"),
    ["alice"]
  );
});

test("tokenizeRichText keeps mentions and urls in order", () => {
  const lines = tokenizeRichText("Hello @Alice see example.com");
  assert.equal(lines.length, 1);
  assert.deepEqual(
    lines[0].map(token => token.type),
    ["text", "mention", "text", "url"]
  );
  assert.equal(lines[0][1].value, "alice");
  assert.equal(lines[0][3].value, "https://example.com");
});
