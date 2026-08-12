import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoPostUrl, buildCanonicalPostUrl } from "./video-url.mjs";

test("buildVideoPostUrl creates the shareable video route", () => {
  assert.equal(buildVideoPostUrl("jane", "post-123"), "/jane/post-123/video");
  assert.equal(buildCanonicalPostUrl("jane", "post-123"), "/jane/post-123");
});
