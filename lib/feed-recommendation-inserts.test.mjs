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
