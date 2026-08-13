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

test("rankVideoCandidates keeps strict field priority even with a seed", () => {
  const candidates = [
    { id: "watch-heavy", watchTime: 100, likes: 1, tags: 0, quotes: 0, replies: 0, follows: 0 },
    { id: "likes-heavy", watchTime: 20, likes: 50, tags: 0, quotes: 0, replies: 0, follows: 0 },
  ];

  for (const seed of ["user-a", "user-b", "user-c"]) {
    const ranked = rankVideoCandidates(candidates, seed);
    assert.deepEqual(ranked.map(c => c.id), ["watch-heavy", "likes-heavy"]);
  }
});

test("rankVideoCandidates orders tied candidates differently per seed", () => {
  const tied = Array.from({ length: 10 }, (_, i) => ({
    id: `post-${i}`,
    watchTime: 0,
    likes: 0,
    tags: 0,
    quotes: 0,
    replies: 0,
    follows: 0,
  }));

  const orderForUserA = rankVideoCandidates(tied, "user-a").map(c => c.id);
  const orderForUserB = rankVideoCandidates(tied, "user-b").map(c => c.id);
  const unseeded = rankVideoCandidates(tied).map(c => c.id);

  // Different viewers see a different order among tied (equally-ranked)
  // candidates instead of everyone getting the same feedPosts-array order.
  assert.notDeepEqual(orderForUserA, orderForUserB);
  // Same seed is reproducible, not re-randomized on every call.
  assert.deepEqual(orderForUserA, rankVideoCandidates(tied, "user-a").map(c => c.id));
  // No seed at all preserves the original (stable-sort) input order —
  // unchanged behavior for any caller that doesn't opt in.
  assert.deepEqual(unseeded, tied.map(c => c.id));
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
