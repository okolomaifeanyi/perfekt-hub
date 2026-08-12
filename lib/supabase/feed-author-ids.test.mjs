import assert from "node:assert/strict";
import test from "node:test";
import { mergeFeedAuthorIds } from "./feed-author-ids.mjs";

test("mergeFeedAuthorIds deduplicates and filters empty ids", () => {
  const ids = mergeFeedAuthorIds("me", ["a", "b", "a", ""], ["b", "c", null, undefined]);

  assert.deepEqual(ids, ["me", "a", "b", "c"]);
});
