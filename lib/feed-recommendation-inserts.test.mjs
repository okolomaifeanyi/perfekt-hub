import test from "node:test";
import assert from "node:assert/strict";
import { computeRecommendationSlots } from "./feed-recommendation-inserts.mjs";

test("computeRecommendationSlots inserts carousels only when the feed is dense enough", () => {
  const slots = computeRecommendationSlots({
    itemCount: 18,
    engagementScore: 0.8,
    availableTypes: ["groups", "friends", "events"],
  });

  assert.equal(slots.length, 2);
  assert.deepEqual(slots[0], { index: 5, type: "groups" });
  assert.deepEqual(slots[1], { index: 11, type: "friends" });
});

test("computeRecommendationSlots returns no inserts for a short feed", () => {
  const slots = computeRecommendationSlots({
    itemCount: 4,
    engagementScore: 0.2,
    availableTypes: ["groups", "friends"],
  });

  assert.deepEqual(slots, []);
});

test("computeRecommendationSlots with a seed picks from the full type pool, not just the first entries", () => {
  const manyTypes = ["friends", "follows", "groups", "events", "videos", "saves", "matches", "news", "fixtures"];
  const seenTypes = new Set();

  // Across many different seeds, every type should get picked at least
  // once for the first slot — proof the whole pool is reachable, not just
  // whichever entries happen to be listed first.
  for (let i = 0; i < 200; i += 1) {
    const slots = computeRecommendationSlots({
      itemCount: 24,
      engagementScore: 0.8,
      availableTypes: manyTypes,
      seed: `seed-${i}`,
    });
    if (slots[0]) seenTypes.add(slots[0].type);
  }

  assert.ok(seenTypes.size > 3, `expected variety across seeds, only saw: ${[...seenTypes]}`);
});

test("computeRecommendationSlots is deterministic for the same seed", () => {
  const types = ["friends", "follows", "groups", "events", "videos"];
  const a = computeRecommendationSlots({ itemCount: 24, engagementScore: 0.8, availableTypes: types, seed: "same" });
  const b = computeRecommendationSlots({ itemCount: 24, engagementScore: 0.8, availableTypes: types, seed: "same" });
  assert.deepEqual(a, b);
});

test("computeRecommendationSlots without a seed keeps the original deterministic order", () => {
  const slots = computeRecommendationSlots({
    itemCount: 18,
    engagementScore: 0.8,
    availableTypes: ["groups", "friends", "events"],
  });

  assert.deepEqual(slots[0], { index: 5, type: "groups" });
  assert.deepEqual(slots[1], { index: 11, type: "friends" });
});
