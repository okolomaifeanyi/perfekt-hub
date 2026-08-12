import test from "node:test";
import assert from "node:assert/strict";
import { rankVideoCandidates, refillVideoQueue } from "./video-recommendations.mjs";

test("rankVideoCandidates orders watch time before likes tags quotes replies and follows", () => {
  const ranked = rankVideoCandidates([
    { id: "watch-heavy", watchTime: 100, likes: 1, tags: 0, quotes: 0, replies: 0, follows: 0 },
    { id: "likes-heavy", watchTime: 20, likes: 50, tags: 0, quotes: 0, replies: 0, follows: 0 },
    { id: "tags-heavy", watchTime: 20, likes: 1, tags: 40, quotes: 0, replies: 0, follows: 0 },
    { id: "quotes-heavy", watchTime: 20, likes: 1, tags: 1, quotes: 20, replies: 0, follows: 0 },
    { id: "replies-heavy", watchTime: 20, likes: 1, tags: 1, quotes: 1, replies: 15, follows: 0 },
    { id: "follows-heavy", watchTime: 20, likes: 1, tags: 1, quotes: 1, replies: 1, follows: 10 },
  ]);

  assert.deepEqual(ranked.map(candidate => candidate.id), [
    "watch-heavy",
    "likes-heavy",
    "tags-heavy",
    "quotes-heavy",
    "replies-heavy",
    "follows-heavy",
  ]);
});

test("refillVideoQueue keeps the queue filled up to the target size", () => {
  const queue = refillVideoQueue({
    currentQueue: [{ id: "a" }, { id: "b" }],
    candidates: [{ id: "c" }, { id: "d" }, { id: "e" }, { id: "f" }],
    targetSize: 4,
  });

  assert.equal(queue.length, 4);
  assert.deepEqual(queue.map(item => item.id), ["a", "b", "c", "d"]);
});
