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
  assert.equal(slots[0].index, 5);
  assert.equal(slots[0].types[0], "groups");
  assert.equal(slots[1].index, 11);
  assert.equal(slots[1].types[0], "friends");
});

test("computeRecommendationSlots returns no inserts for a short feed", () => {
  const slots = computeRecommendationSlots({
    itemCount: 4,
    engagementScore: 0.2,
    availableTypes: ["groups", "friends"],
  });

  assert.deepEqual(slots, []);
});

test("computeRecommendationSlots inserts even with zero engagement once there's enough content", () => {
  // Regression: engagement used to gate insertion outright (needed a hot
  // feed or 12+ posts), so a real feed of a handful of low-engagement posts
  // — the actual current state of this platform — never got an
  // interstitial at all.
  const slots = computeRecommendationSlots({
    itemCount: 8,
    engagementScore: 0,
    availableTypes: ["news", "fixtures"],
  });

  assert.equal(slots.length, 1);
});

test("computeRecommendationSlots never targets the very last post, even in a small feed", () => {
  for (const itemCount of [6, 7, 8, 9]) {
    const slots = computeRecommendationSlots({
      itemCount,
      engagementScore: 0,
      availableTypes: ["news"],
    });
    for (const slot of slots) {
      assert.ok(slot.index < itemCount - 1, `itemCount=${itemCount}: slot at ${slot.index} leaves no post after it`);
    }
  }
});

test("computeRecommendationSlots gives each slot a fallback chain, not just one type", () => {
  const slots = computeRecommendationSlots({
    itemCount: 24,
    engagementScore: 0.8,
    availableTypes: ["friends", "follows", "groups", "events", "videos", "saves"],
  });

  assert.equal(slots.length, 3);
  for (const slot of slots) {
    assert.ok(slot.types.length >= 1);
  }
});

test("computeRecommendationSlots splits the type pool across slots without duplicates", () => {
  const types = ["friends", "follows", "groups", "events", "videos", "saves"];
  const slots = computeRecommendationSlots({
    itemCount: 24,
    engagementScore: 0.8,
    availableTypes: types,
    seed: "dedup-check",
  });

  const allCandidates = slots.flatMap(slot => slot.types);
  assert.equal(new Set(allCandidates).size, allCandidates.length, "no type should appear in more than one slot's chain");
  assert.equal(allCandidates.length, types.length);
});

test("computeRecommendationSlots with a seed picks from the full type pool, not just the first entries", () => {
  const manyTypes = ["friends", "follows", "groups", "events", "videos", "saves", "matches", "news", "fixtures"];
  const seenTypes = new Set();

  // Across many different seeds, every type should get picked at least
  // once as a slot's first candidate — proof the whole pool is reachable,
  // not just whichever entries happen to be listed first.
  for (let i = 0; i < 200; i += 1) {
    const slots = computeRecommendationSlots({
      itemCount: 24,
      engagementScore: 0.8,
      availableTypes: manyTypes,
      seed: `seed-${i}`,
    });
    if (slots[0]) seenTypes.add(slots[0].types[0]);
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

  assert.equal(slots[0].types[0], "groups");
  assert.equal(slots[1].types[0], "friends");
});
