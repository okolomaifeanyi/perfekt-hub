import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscoverSections } from "./discover-surface.mjs";

test("buildDiscoverSections prefers saves, events, groups, and people in that order", () => {
  const sections = buildDiscoverSections({
    savedCount: 12,
    eventCount: 8,
    groupCount: 20,
    peopleCount: 15,
  });

  assert.deepEqual(sections.map(section => section.type), [
    "saves",
    "events",
    "groups",
    "people",
  ]);
});
